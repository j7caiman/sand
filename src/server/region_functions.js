var debug = require('debug')('sand');
var fs = require('fs');

var sand = {
	modifyRegion: require("../shared/dune_functions"),
	globalFunctions: require("../shared/global_functions"),
	constants: require("../shared/global_constants")
};
var RegionNode = require("../shared/RegionNode");

module.exports = {
	generateRegions: function (regionNames, regionGenerationComplete) {
		var regionZipCodes = [];
		regionNames.forEach(function (regionName) {
			var regionZipCode = Math.floor(regionName.split("_")[0] / sand.constants.kZipCodeWidth)
				+ "_" + Math.floor(regionName.split("_")[1] / sand.constants.kZipCodeWidth);

			if (regionZipCodes.indexOf(regionZipCode) === -1) {
				regionZipCodes.push(regionZipCode);
			}
		});

		const numZipCodesToAccountFor = regionZipCodes.length;
		var numZipCodesLoaded = 0;

		function onComplete(error) {
			if (error) {
				regionGenerationComplete(error);
			} else {
				numZipCodesLoaded++;
				if (numZipCodesLoaded === numZipCodesToAccountFor) {
					regionGenerationComplete();
				}
			}
		}

		regionZipCodes.forEach(function (zipCode) {
			var zipCodeHandler = new ZipCodeHandler(zipCode, onComplete);
			zipCodeHandler.handle(onComplete);
		});
	}
};

var ZipCodeHandler = function (zipCode) {
	this._zipCode = zipCode;
};
ZipCodeHandler.fileLocks = {};

ZipCodeHandler.prototype = {
	constructor: ZipCodeHandler,

	handle: function (onComplete) {
		var that = this;
		var zipCode = this._zipCode;
		var path = './resources/world_datastore/z' + zipCode;
		fs.readdir(path, function (err) {
			if (err == null) {
				onComplete();
			} else if (err.code == 'ENOENT') {
				if (ZipCodeHandler.fileLocks[zipCode] === undefined) {
					that._createRegions(onComplete);
				} else {
					debug("zip code: " + zipCode + " is locked. " +
					"Waiting for 100ms, then attempting to read again once.");
					setTimeout(function () {
						if (ZipCodeHandler.fileLocks[zipCode] === undefined) {
							fs.readdir(path, function (err) {
								if (err == null) {
									onComplete();
								} else {
									throw err;
								}
							});
						} else {
							debug("zip code lookup failed. file: " + zipCode + " is locked.");
							onComplete("zip code locked: " + zipCode);
						}
					}, 100);
				}
			} else {
				throw err;
			}
		});
	},

	_createRegions: function (onComplete) {
		var zipCode = this._zipCode;
		ZipCodeHandler.fileLocks[zipCode] = true;

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
		var tempDirectory = './resources/world_datastore/z' + zipCode + "temp";
		fs.mkdir(tempDirectory, function (err) {
			if (err) {
				if (err.code == 'EEXIST') {
					debug("Path: " + tempDirectory + " already exists. Was the server recently restarted? " +
					"Overwriting file contents with new regions.");
				} else {
					throw err;
				}
			}

			regionsToCreate.forEach(function (region) {
				var path = tempDirectory + '/r' + region.getName() + '.json';
				fs.writeFile(path, JSON.stringify(region.getData()), function (err) {
					if (err) {
						throw err;
					}

					numRegionsCreated++;
					if (numRegionsCreated === numRegionsToCreate) {
						var directory = tempDirectory.replace('temp', '');
						fs.rename(tempDirectory, directory, function () {
							if (err) {
								throw err;
							}

							delete ZipCodeHandler.fileLocks[zipCode];
							onComplete();
						});
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
				grid[y].push([0,0]);
			}
		}
		return grid;
	}
};