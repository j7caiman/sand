var debug = require('debug')('sand');
var fs = require('fs');
var zlib = require('zlib');
var stream = require('stream');

var sand = {
	duneFunctions: require("../shared/dune_functions"),
	globalFunctions: require("../shared/global_functions"),
	constants: require("../shared/global_constants")
};
var RegionNode = require("../shared/RegionNode");

module.exports = {
	generateMissingRegions: function (regionName, onComplete) {
		var zipCode = sand.globalFunctions.getRegionZipCode(regionName);

		var path = './resources/world_datastore/z' + zipCode;
		fs.readdir(path, function (err) {
			if (err == null) { // regions are already present
				onComplete();
			} else if (err.code == 'ENOENT') {
				if(isZipCodeInitializing(zipCode)) {
					callFunctionWhenZipCodeInitialized(zipCode, onComplete)
				} else {
					initializeNewZipCode(zipCode, onComplete);
				}
			} else {
				throw err;
			}
		});
	}
};

var _zipCodes = {};

function isZipCodeInitializing(zipCode) {
	return _zipCodes[zipCode] !== undefined;
}

function callFunctionWhenZipCodeInitialized(zipCode, onComplete) {
	_zipCodes[zipCode].addFunctionToCallOnComplete(onComplete);
}

function initializeNewZipCode(zipCode, onComplete) {
	_zipCodes[zipCode] = new ZipCodeHandler(zipCode, onComplete);
	_zipCodes[zipCode].createRegions();
}

function remove(zipCode) {
	delete _zipCodes[zipCode];
}

var ZipCodeHandler = function (zipCode, onComplete) {
	this._zipCode = zipCode;
	this._onCompletes = [onComplete];
};

ZipCodeHandler.prototype = {
	constructor: ZipCodeHandler,

	addFunctionToCallOnComplete: function(onComplete) {
		this._onCompletes.push(onComplete);
	},

	_finish: function () {
		this._onCompletes.forEach(function(onComplete) {
			onComplete();
		});
		remove(this._zipCode);
	},

	createRegions: function () {
		var that = this;
		var zipCode = that._zipCode;

		var regionNamesToCreate = sand.duneFunctions.listRegionNamesInZipCode(zipCode);
		var regionsToCreate = regionNamesToCreate.map(function (regionName) {
			var region = new RegionNode(regionName);
			region.setData(that._createGrid(256));
			return region;
		});

		sand.duneFunctions.generateLargeDune(regionsToCreate);
		sand.duneFunctions.generateBumps(regionsToCreate);

		var numRegionsToCreate = sand.constants.kZipCodeWidth * sand.constants.kZipCodeWidth;
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
				var path = tempDirectory + '/r' + region.getName() + '.json.gz';
				var data = JSON.stringify(region.getData());

				var readStream = new stream.Readable();
				readStream.push(data);
				readStream.push(null);

				var gzip = zlib.createGzip();
				var writeStream = fs.createWriteStream(path);

				readStream.pipe(gzip).pipe(writeStream);

				writeStream.on('error', function (error) {
					throw error;
				});

				writeStream.on('finish', function () {
					numRegionsCreated++;
					if (numRegionsCreated === numRegionsToCreate) {
						var directory = tempDirectory.replace('temp', '');
						fs.rename(tempDirectory, directory, function () {
							if (err) {
								throw err;
							}

							that._finish();
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
				grid[y].push([0, 0]);
			}
		}
		return grid;
	}
};