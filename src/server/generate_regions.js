var debug = require('debug')('sand');
var zlib = require('zlib');

var query = require('./query_db');

var sand = {
	duneFunctions: require("../shared/dune_functions"),
	globalFunctions: require("../shared/global_functions"),
	constants: require("../shared/global_constants")
};
var RegionNode = require("../shared/RegionNode");

module.exports = function generateMissingRegions(regionName, onComplete) {
	query('select exists (select 1 from regions where region_name = $1)', [regionName], function (error, result) {
		if (error) {
			throw error;
		}

		var exists = result.rows[0].exists;
		if (exists) {
			onComplete();
		} else {
			var zipCode = sand.globalFunctions.getRegionZipCode(regionName);
			var initializer;
			if (zipCodeInitializers.exists(zipCode)) {
				initializer = zipCodeInitializers.get(zipCode);
				if (initializer.isFinished()) {
					onComplete();
				} else {
					initializer.addCallback(onComplete);
				}
			} else {
				initializer = zipCodeInitializers.add(zipCode);
				initializer.addCallback(onComplete);
				initializer.createRegions();
			}
		}
	});
};

var zipCodeInitializers = (function () {
	var map = {};

	function get(zipCode) {
		return map[zipCode];
	}

	function exists(zipCode) {
		return map[zipCode] !== undefined;
	}

	function add(zipCode) {
		map[zipCode] = new ZipCodeHandler(zipCode);
		return map[zipCode];
	}

	return {
		get: get,
		exists: exists,
		add: add
	}
})();

var ZipCodeHandler = function (zipCode) {
	this._zipCode = zipCode;
	this._onCompletes = [];
	this._initialized = false;
};

ZipCodeHandler.prototype = {
	constructor: ZipCodeHandler,

	isFinished: function () {
		return this._initialized;
	},

	addCallback: function (onComplete) {
		this._onCompletes.push(onComplete);
	},

	_finish: function () {
		this._initialized = true;
		this._onCompletes.forEach(function (onComplete) {
			onComplete();
		});
	},

	createRegions: function () {
		var that = this;

		var regionNamesToCreate = sand.duneFunctions.listRegionNamesInZipCode(that._zipCode);
		var regionsToCreate = regionNamesToCreate.map(function (regionName) {
			var region = new RegionNode(regionName);
			region.setData(that._createGrid(256));
			return region;
		}); // note: regionsToCreate is about 17MB

		sand.duneFunctions.generateLargeDune(regionsToCreate);
		sand.duneFunctions.generateBumps(regionsToCreate);

		var numRegionsToCreate = sand.constants.kZipCodeWidth * sand.constants.kZipCodeWidth;
		var numRegionsCreated = 0;
		regionsToCreate.forEach(function (region) {
			var data = JSON.stringify(region.getData());
			zlib.gzip(data, function (error, compressedData) {
				if (error) {
					throw error;
				}

				query('insert into regions (region_name, region_data) values ($1, $2)', [region.getName(), compressedData], function (error) {
					if (error) {
						throw error;
					}

					numRegionsCreated++;
					if (numRegionsCreated === numRegionsToCreate) {
						that._finish();
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