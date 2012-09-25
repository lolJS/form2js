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
js2form = new Class({
Implements: Options,
options: {
	rootNode: null,
	delimiter: null,
	skipEmpty: null,
	nodeCallback: null,
	useIdIfEmpty: null,
	data: null
},
useIdIfEmptyName: null,
fieldValues: null,
formFieldsByName: null,
_subArrayRegexp: /^\[\d+?\]/,
_subObjectRegexp: /^[a-zA-Z_][a-zA-Z_0-9]+/,
_arrayItemRegexp: /\[[0-9]+?\]$/,
_lastIndexedArrayRegexp: /(.*)(\[)([0-9]*)(\])$/,
_arrayOfArraysRegexp: /\[([0-9]+)\]\[([0-9]+)\]/g,
_inputOrTextareaRegexp: /INPUT|TEXTAREA/i,

/**
*
* @param rootNode
* @param data
* @param delimiter
* @param nodeCallback
* @param useIdIfEmptyName
*/
	initialize: function(options) {
		this.setOptions(options);
		if (typeof this.options.skipEmpty == 'undefined' || this.options.skipEmpty == null) this.options.skipEmpty = true;
		if (typeof this.options.delimiter == 'undefined' || this.options.delimiter == null) this.options.delimiter = '.';
		if (this.options.useIdIfEmpty == null) this.useIdIfEmptyName = false;
		this.rootNode = this.options.rootNode;
	},
	rm: function() {
		this.fieldValues = this.object2array(this.options.data);
		this.formFieldsByName = this.getFields(this.rootNode, this.useIdIfEmptyName, this.options.delimiter, {}, true);

		for (var i = 0; i < this.fieldValues.length; i++) {
			var fieldName = this.fieldValues[i].name;
			var fieldValue = this.fieldValues[i].value;

			if (typeof this.formFieldsByName[fieldName] != 'undefined') {
				this.setValue(this.formFieldsByName[fieldName], fieldValue);
			} else if (typeof this.formFieldsByName[fieldName.replace(this._arrayItemRegexp, '[]')] != 'undefined') {
				this.setValue(this.formFieldsByName[fieldName.replace(this._arrayItemRegexp, '[]')], fieldValue);
			}
		}
	},
	setValue: function(field, value) {
		var children, i, l;

		if (field instanceof Array) {
			for(i = 0; i < field.length; i++)
				if (field[i].value == value) 
					field[i].checked = true;

		} else if (this._inputOrTextareaRegexp.test(field.nodeName)) {
			field.value = (value == null) ? '' : value;

		} else if (/SELECT/i.test(field.nodeName)) {
			children = field.getElementsByTagName('option');

			for (i = 0,l = children.length; i < l; i++) {

				if (children[i].value == value) {
					children[i].selected = true;
					if (field.multiple) 
						break;
				} else if (!field.multiple) {
					children[i].selected = false;
				}
			}
		}
	},

	getFields: function(rootNode, useIdIfEmptyName, delimiter, arrayIndexes, shouldClean) {
		if (arguments.length < 4) arrayIndexes = {};

		var result = {},
		currNode = $(rootNode).firstChild,
		name, nameNormalized,
		subFieldName,
		i, j, l,
		options;

		while (currNode) {
			name = '';

			if (currNode.name && currNode.name != '') {
				name = currNode.name;
			}
			else if (useIdIfEmptyName && currNode.id && currNode.id != '') {
				name = currNode.id;
			}

			if (name == '') {
				var subFields = this.getFields(currNode, useIdIfEmptyName, delimiter, arrayIndexes, shouldClean);
				for (subFieldName in subFields) {
					if (typeof result[subFieldName] == 'undefined') {
						result[subFieldName] = subFields[subFieldName];
					} else {
						for (i = 0; i < subFields[subFieldName].length; i++) {
							if (result[subFieldName].tagName == "SELECT")
								result[subFieldName].add(subFields[subFieldName][i]);
							else
								result[subFieldName].push(subFields[subFieldName][i]);
						}
					}
				}
		} else {
			if (/SELECT/i.test(currNode.nodeName)) {
				for(j = 0, options = currNode.getElementsByTagName('option'), l = options.length; j < l; j++) {
					if (shouldClean) {
						options[j].selected = false;
					}

					nameNormalized = this.normalizeName(name, delimiter, arrayIndexes);
					result[nameNormalized] = currNode;
				}
			} else if (/INPUT/i.test(currNode.nodeName) && /CHECKBOX|RADIO/i.test(currNode.type)) {
				if(shouldClean) {
					currNode.checked = false;
				}

				nameNormalized =	this.normalizeName(name, delimiter, arrayIndexes);
				nameNormalized = nameNormalized.replace(this._arrayItemRegexp, '[]');
				
				if (!result[nameNormalized]) result[nameNormalized] = [];
					result[nameNormalized].push(currNode);
			} else {
				if (shouldClean) {
					currNode.value = '';
				}

				nameNormalized = this.normalizeName(name, delimiter, arrayIndexes);
				result[nameNormalized] = currNode;

			}
		}
		currNode = currNode.nextSibling;
		}

	return result;
	},

	/**
	* Normalizes names of arrays, puts correct indexes (consecutive and ordered by element appearance in HTML)
	* @param name
	* @param delimiter
	* @param arrayIndexes
	*/
	normalizeName: function(name, delimiter, arrayIndexes) {
		var nameChunksNormalized = [],
		nameChunks = name.split(delimiter),
		currChunk,
		nameMatches,
		nameNormalized,
		currIndex,
		newIndex,
		i;

		name = name.replace(this._arrayOfArraysRegexp, '[$1].[$2]');
		
		for (i = 0; i < nameChunks.length; i++) {
			currChunk = nameChunks[i];
			nameChunksNormalized.push(currChunk);
			nameMatches = currChunk.match(this._lastIndexedArrayRegexp);

		if (nameMatches != null) {
			nameNormalized = nameChunksNormalized.join(delimiter);
			currIndex = nameNormalized.replace(this._lastIndexedArrayRegexp, '$3');
			nameNormalized = nameNormalized.replace(this._lastIndexedArrayRegexp, '$1');

			if (typeof (arrayIndexes[nameNormalized]) == 'undefined') {
				arrayIndexes[nameNormalized] = {
				lastIndex: -1,
				indexes: {}
				};
			}

			if (currIndex == '' || typeof arrayIndexes[nameNormalized].indexes[currIndex] == 'undefined') {
				arrayIndexes[nameNormalized].lastIndex++;
				arrayIndexes[nameNormalized].indexes[currIndex] = arrayIndexes[nameNormalized].lastIndex;
			}

				newIndex = arrayIndexes[nameNormalized].indexes[currIndex];
				nameChunksNormalized[nameChunksNormalized.length - 1] = currChunk.replace(this._lastIndexedArrayRegexp, '$1$2' + newIndex + '$4');
			}
		}

		nameNormalized = nameChunksNormalized.join(delimiter);
		nameNormalized = nameNormalized.replace('].[', '][');
		return nameNormalized;
	},
	object2array: function(obj, lvl) {
		var result = [], i, name;

		if (arguments.length == 1) lvl = 0;

		if (obj == null) {
			result = [{ name: "", value: null }];
		}
		else if (typeof obj == 'string' || typeof obj == 'number' || typeof obj == 'date' || typeof obj == 'boolean') {
			result = [
				{ name: "", value : obj }
			];
		}
		else if (obj instanceof Array) {
			for (i = 0; i < obj.length; i++)
			{
				name = "[" + i + "]";
				result = result.concat(this.getSubValues(obj[i], name, lvl + 1));
			}
		} else {
			for (i in obj)
			{
				name = i;
				result = result.concat(this.getSubValues(obj[i], name, lvl + 1));
			}
		}

		return result;
	},
	getSubValues: function(subObj, name, lvl) {
		var itemName;
		var result = [], tempResult = this.object2array(subObj, lvl + 1), i, tempItem;

		for (i = 0; i < tempResult.length; i++) {
			itemName = name;
			if (this._subArrayRegexp.test(tempResult[i].name)) {
				itemName += tempResult[i].name;
			}
			else if (this._subObjectRegexp.test(tempResult[i].name)) {
				itemName += '.' + tempResult[i].name;
			}

			tempItem = { name: itemName, value: tempResult[i].value };
			result.push(tempItem);
		}
		return result;
	}
});