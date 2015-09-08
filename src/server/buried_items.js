var fs = require('fs');

module.exports = {
	initialize: initialize,
	getBuriedItem: getBuriedItem
};

var buriedItems = [];

function BuriedItem(id, category, text) {
	this._id = id;
	this._category = category;
	this._text = text;
}

/**
 * buried_items.json contains every item able to be found by digging.
 * When adding entries, only append to the arrays. Do not delete, rearrange,
 * or insert entries into any location other than the end.
 */
function initialize() {
	var path = "./resources/buried_items.json";
	fs.readFile(path, function (error, data) {
		if (error) {
			throw error;
		}

		data = JSON.parse(data);

		buriedItems = buriedItems.concat(
			initializeSimpleCategory("buriedObjects"),
			initializeSimpleCategory("electronicData"),
			initializeSimpleCategory("electronicData2"),
			initializeSimpleCategory("historicalRecord"),
			initializeSimpleCategory("longFormText"),
			initializeSimpleCategory("parchmentText"),
			initializeFinancialDataCategory(),
			initializeMiscellaneousDataCategory()
		);


		function initializeSimpleCategory(category) {
			return data[category].list.map(function (content, index) {
				return new BuriedItem(index, category, data[category].introduction + content + data[category].conclusion);
			});
		}

		function initializeFinancialDataCategory() {
			var category = "financialData";
			return data[category].companyNames.map(function (companyName, index) {
				var content = [];
				for (var i = getRandomInt(0, 4); i < data[category].sampleEntries.length; i += getRandomInt(1, 8)) {
					content.push(data[category].sampleEntries[i] + getRandomInt(100000, 10000000));
				}
				return new BuriedItem(index, category, data[category].introduction + content.join('\n') + data[category].conclusion);
			});
		}

		function initializeMiscellaneousDataCategory() {
			var category = "miscellaneous";
			return data[category].list.map(function (content, index) {
				return new BuriedItem(index, category, content);
			});
		}
	});
}

function getBuriedItem() {
	if (Math.random() > 0.8) {
		return buriedItems[getRandomInt(0, buriedItems.length)]._text.split('\n').join('\<br/\>');
	}
}

function getRandomInt(min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}