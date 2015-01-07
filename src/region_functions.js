var fs = require('fs');

module.exports = {
	_zipCodeWidth: 4,

	getRegionZipCode: function (regionName) {
		var coordinates = regionName.split("_");
		return Math.floor(coordinates[0] / this._zipCodeWidth)
			+ "_" + Math.floor(coordinates[1] / this._zipCodeWidth);
	},

	generateRegions: function(regionNames, onComplete) {
		var that = this;

		const zipCodeWidth = this._zipCodeWidth;
		var regionZipCodes = [];
		regionNames.forEach(function (regionName) {
			var regionZipCode = Math.floor(regionName.split("_")[0] / zipCodeWidth)
				+ "_" + Math.floor(regionName.split("_")[1] / zipCodeWidth);

			if(regionZipCodes.indexOf(regionZipCode) === -1) {
				regionZipCodes.push(regionZipCode);
			}
		});

		var zipCodesToAccountFor = regionZipCodes.length;
		regionZipCodes.forEach(function (zipCode) {
			var path = '../resources/world_datastore/' + zipCode;
			fs.readdir(path, function (err) {
				function zipCodeCompleted() {
					zipCodesToAccountFor--;
					if (zipCodesToAccountFor === 0) {
						onComplete();
					}
				}

				if (err == null) {
					zipCodeCompleted();
				} else if (err.code == 'ENOENT') {
					that._createRegionsForZipCode(zipCode, function () {
						zipCodeCompleted();
					});
				} else {
					throw err;
				}
			});
		});
	},

	_createRegionsForZipCode: function(zipCode, onComplete) {
		var that = this;

		const zipCodeWidth = this._zipCodeWidth;
		const numRegionsToCreate = zipCodeWidth * zipCodeWidth;
		var numRegionsCreated = 0;
		fs.mkdir('../resources/world_datastore/' + zipCode, function (err) {
			if (err) {
				throw err;
			}

			var regionsToCreate = that._listRegionsInZipCode(zipCode);

			regionsToCreate.forEach(function (region) {
				var path = '../resources/world_datastore/' + zipCode + '/' + region.name + '.json';
				region.data = JSON.stringify(that._createGrid(256));

				fs.writeFile(path, region.data, function (err) {
					if (err) {
						throw err;
					}

					numRegionsCreated++;
					if (numRegionsCreated === numRegionsToCreate) {
						onComplete();
					}
				});
			});
		});
	},

	_listRegionsInZipCode: function(zipCode) {
		const zipCodeWidth = this._zipCodeWidth;

		var regionsToCreate = [];
		for (var x = 0; x < zipCodeWidth; x++) {
			for (var y = 0; y < zipCodeWidth; y++) {
				var coordinates = {};
				coordinates.x = (zipCode.split("_")[0] * zipCodeWidth) + x;
				coordinates.y = (zipCode.split("_")[1] * zipCodeWidth) + y;
				regionsToCreate.push({
					name: coordinates.x + "_" + coordinates.y
				});
			}
		}
		return regionsToCreate;
	},

	_createGrid: function (width) {
		var grid = [];
		for (var y = 0; y < width; y++) {
			grid.push([]);
			for (var x = 0; x < width; x++) {
				grid[y].push(0);
			}
		}
		return grid;
	}
};