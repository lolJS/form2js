/**
 * Copyright (c) 2010 Maxim Vasiliev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @author Maxim Vasiliev
 * Date: 19.09.11
 * Time: 23:40
 */
form2js = new Class({
	Implements: Options,
	options: {
		rootNode: null,
		delimiter: null,
		skipEmpty: null,
		nodeCallback: null,
		useIdIfEmpty: null,
		emptyToNull: null,
	},
	useIdIfEmptyName: null,
	formValues: null,
	nodeCallback: null,
	emptyToNull: null,
	initialize: function(options) {
		this.setOptions(options);
		
		if (typeof this.options.skipEmpty == 'undefined' || this.options.skipEmpty == null) this.options.skipEmpty = true;
		if (typeof this.options.emptyToNull == 'undefined' || this.options.emptyToNull == null) this.emptyToNull = true;
		if (typeof this.options.delimiter == 'undefined' || this.options.delimiter == null) this.options.delimiter = '.';
		if (this.options.useIdIfEmpty == null) this.useIdIfEmptyName = false;

		this.rootNode = typeof this.options.rootNode == 'string' ? $(this.options.rootNode) : this.options.rootNode;
		this.nodeCallback = this.options.nodeCallback;
	
	},
	on: function() {
		var formValues = [], currNode, i = 0;
		/* If rootNode is array - combine values */
		if (this.rootNode.constructor == Array || (typeof NodeList != "undefined" && this.rootNode.constructor == NodeList)) {
			while(currNode = this.rootNode[i++]) {
				formValues = formValues.concat(this.getFormValues(currNode, this.nodeCallback, this.useIdIfEmptyName));
			}
		}
		else {
			formValues = this.getFormValues(this.rootNode, this.nodeCallback, this.useIdIfEmptyName);
		}

		return this.processNameValues(formValues, this.options.skipEmpty, this.emptyToNull, this.options.delimiter);
	},
	processNameValues: function(nameValues, skipEmpty, delimiter) {
		var result = {},
			arrays = {},
			i, j, k, l,
			value,
			nameParts,
			currResult,
			arrNameFull,
			arrName,
			arrIdx,
			namePart,
			name,
			_nameParts;

			for (i = 0; i < nameValues.length; i++) {
				value = nameValues[i].value;

				if (this.emptyToNull && (value === '')) { value = null; }
				if (skipEmpty && (value === '' || value === null)) continue;

				name = nameValues[i].name;
				if (typeof name === 'undefined') continue;

				_nameParts = name.split(this.options.delimiter);
				nameParts = [];
				currResult = result;
				arrNameFull = '';

				for(j = 0; j < _nameParts.length; j++)
				{
					namePart = _nameParts[j].split('][');
					if (namePart.length > 1)
					{
						for(k = 0; k < namePart.length; k++)
						{
							if (k == 0)
							{
								namePart[k] = namePart[k] + ']';
							}
							else if (k == namePart.length - 1)
							{
								namePart[k] = '[' + namePart[k];
							}
							else
							{
								namePart[k] = '[' + namePart[k] + ']';
							}

							arrIdx = namePart[k].match(/([a-z_]+)?\[([a-z_][a-z0-9_]+?)\]/i);
							if (arrIdx)
							{
								for(l = 1; l < arrIdx.length; l++)
								{
									if (arrIdx[l]) nameParts.push(arrIdx[l]);
								}
							}
							else{
								nameParts.push(namePart[k]);
							}
						}
					}
					else
						nameParts = nameParts.concat(namePart);
				}

				for (j = 0; j < nameParts.length; j++)
				{
					namePart = nameParts[j];

					if (namePart.indexOf('[]') > -1 && j == nameParts.length - 1)
					{
						arrName = namePart.substr(0, namePart.indexOf('['));
						arrNameFull += arrName;

						if (!currResult[arrName]) currResult[arrName] = [];
						currResult[arrName].push(value);
					}
					else if (namePart.indexOf('[') > -1)
					{
						arrName = namePart.substr(0, namePart.indexOf('['));
						arrIdx = namePart.replace(/(^([a-z_]+)?\[)|(\]$)/gi, '');

						/* Unique array name */
						arrNameFull += '_' + arrName + '_' + arrIdx;

						/*
						 * Because arrIdx in field name can be not zero-based and step can be
						 * other than 1, we can't use them in target array directly.
						 * Instead we're making a hash where key is arrIdx and value is a reference to
						 * added array element
						 */

						if (!arrays[arrNameFull]) arrays[arrNameFull] = {};
						if (arrName != '' && !currResult[arrName]) currResult[arrName] = [];

						if (j == nameParts.length - 1)
						{
							if (arrName == '')
							{
								currResult.push(value);
								arrays[arrNameFull][arrIdx] = currResult[currResult.length - 1];
							}
							else
							{
								currResult[arrName].push(value);
								arrays[arrNameFull][arrIdx] = currResult[arrName][currResult[arrName].length - 1];
							}
						}
						else
						{
							if (!arrays[arrNameFull][arrIdx])
							{
								if ((/^[a-z_]+\[?/i).test(nameParts[j+1])) currResult[arrName].push({});
								else currResult[arrName].push([]);

								arrays[arrNameFull][arrIdx] = currResult[arrName][currResult[arrName].length - 1];
							}
						}

						currResult = arrays[arrNameFull][arrIdx];
					}
					else
					{
						arrNameFull += namePart;

						if (j < nameParts.length - 1) /* Not the last part of name - means object */
						{
							if (!currResult[namePart]) currResult[namePart] = {};
							currResult = currResult[namePart];
						}
						else
						{
							currResult[namePart] = value;
						}
					}
				}
			}
			return result;
		},
	getFormValues: function(rootNode, nodeCallback, useIdIfEmpty) {
		var result = this.extractNodeValues(rootNode, nodeCallback, this.useIdIfEmptyName);
        return result.length > 0 ? result : this.getSubFormValues(rootNode, nodeCallback, this.useIdIfEmptyName);
	},
	getSubFormValues: function(rootNode, nodeCallback, useIdIfEmpty) {
			var result = [],
			currentNode = rootNode.firstChild;

			while (currentNode) {
				var currentResult = this.extractNodeValues(currentNode, nodeCallback, this.useIdIfEmptyName);
				for (var i = 0; i < currentResult.length;i++ ) {
					if(currentResult[i].value !== null) {
						result[result.length] = currentResult[i];
					}
				}
				currentNode = currentNode.nextSibling;
			}
			return result;
	},
	extractNodeValues: function(node, nodeCallback, useIdIfEmptyName) {
		var callbackResult, fieldValue, result, fieldName = this.getFieldName(node, useIdIfEmptyName);

        callbackResult = this.nodeCallback && this.nodeCallback(node);

        if (callbackResult && callbackResult.name) {
            result = [callbackResult];
        }
        else if (fieldName != '' && node.nodeName.match(/INPUT|TEXTAREA/i)) {
            fieldValue = this.getFieldValue(node);
			if (fieldValue == null && node.type == 'radio')
		                result = [];
		            else
		                result = [ { name: fieldName, value: fieldValue} ];
		} else if (fieldName != '' && node.nodeName.match(/SELECT/i)) {
			fieldValue = this.getFieldValue(node);
			result = [ { name: fieldName.replace(/\[\]$/, ''), value: fieldValue } ];
        } else {
            result = this.getSubFormValues(node, nodeCallback, useIdIfEmptyName);
        }

        return result;

	},
	getFieldName: function(node, useIdIfEmptyName) {
		if (node.name && node.name != '') return node.name;
		else if (this.useIdIfEmptyName && node.id && node.id != '') return node.id;
		else return '';
	},
	getFieldValue: function(fieldNode) {
		if (fieldNode.disabled) return null;
		
		switch (fieldNode.nodeName) {
			case 'INPUT':
			case 'TEXTAREA':
				switch (fieldNode.type.toLowerCase()) {
					case 'radio':
						if (fieldNode.checked) return fieldNode.value;
						break;
						case 'checkbox':
		                    if (fieldNode.checked && fieldNode.value === 'true' || fieldNode.value === 'on') return true;
		                    if (!fieldNode.checked && fieldNode.value === 'true' || fieldNode.value === 'on') return false;
							if (fieldNode.checked) return fieldNode.value;
						break;

					case 'button':
					case 'reset':
					case 'submit':
					case 'image':
						return '';
						break;

					default:
						return fieldNode.value;
						break;
				}
				break;

			case 'SELECT':
				return this.getSelectedOptionValue(fieldNode);
				break;

			default:
				break;
		}

		return null;

	},
	getSelectedOptionValue: function(selectNode) {
		var multiple = selectNode.multiple,
			result = [],
			options,
			i, l;

		if (!multiple) return selectNode.value;

		for (options = selectNode.getElementsByTagName('option'), i = 0, l = options.length; i < l; i++) {
			if (options[i].selected) result.push(options[i].value);
		}

		return result; 
	}
	

});