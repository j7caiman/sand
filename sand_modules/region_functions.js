var fs = require('fs');

var sand = {
	modifyRegion: require("../client/javascripts/shared/dune_functions"),
	globalFunctions: require("../client/javascripts/shared/global_functions"),
	constants: require("../client/javascripts/shared/global_constants")
};
var RegionNode = require("../client/javascripts/shared/RegionNode");

module.exports = {
	generateRegions: function (regionNames, onComplete) {
		var that = this;

		var regionZipCodes = [];
		regionNames.forEach(function (regionName) {
			var regionZipCode = Math.floor(regionName.split("_")[0] / sand.constants.kZipCodeWidth)
				+ "_" + Math.floor(regionName.split("_")[1] / sand.constants.kZipCodeWidth);

			if (regionZipCodes.indexOf(regionZipCode) === -1) {
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

	_createRegionsForZipCode: function (zipCode, onComplete) {
		var regionNamesToCreate = sand.modifyRegion.listRegionNamesInZipCode(zipCode);
		var regionsToCreate = regionNamesToCreate.map(function (regionName) {
			var region = new RegionNode(regionName);
			region.setData(this._createGrid(256));
			return region;
		}, this);

		sand.modifyRegion.generateLargeDune(regionsToCreate);
		sand.modifyRegion.generateBumps(regionsToCreate);

		const numRegionsToCreate = sand.constants.kZipCodeWidth * sand.constants.kZipCodeWidth;
		var numRegionsCreated = 0;
		fs.mkdir('../resources/world_datastore/' + zipCode, function (err) {
			if (err) {
				throw err;
			}

			regionsToCreate.forEach(function (region) {
				var path = '../resources/world_datastore/' + zipCode + '/' + region.getName() + '.json';
				fs.writeFile(path, JSON.stringify(region.getData()), function (err) {
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