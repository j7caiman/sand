var debug = require('debug')('sand');
var zlib = require('zlib');

var query = require('./query_db');
var generateMissingRegions = require('./region_functions').generateMissingRegions;
var reservedAreas = require('./caches').getReservedAreas();

var globalFunctions = require('../shared/global_functions');
var brushes = require('../shared/footprint_functions');
var RegionNode = require('../shared/RegionNode');
var pointInsidePolygon = require('../shared/shared_rock_functions').pointInsidePolygon;

var footprintBuffer = {};

function processFootprint(footprintData) {
	var area = globalFunctions.createBoundingBox(
		footprintData.location,
		brushes[footprintData.brush].radius
	);

	var regionNames = globalFunctions.findRegionsInRect(area);
	regionNames.forEach(function (regionName) {
		if (footprintBuffer[regionName] === undefined) {
			footprintBuffer[regionName] = {
				buffer: [],
				locked: false,
				lastFlushTimestamp: 0
			};
		}

		footprintBuffer[regionName].buffer.push(footprintData);

		if (!footprintBuffer[regionName].locked) {
			flushFootprintBuffer(regionName);
		}
	});
}

function flushFootprintBuffer(regionName) {
	if (footprintBuffer[regionName].buffer.length === 0
		|| footprintBuffer[regionName].locked) {
		return;
	}

	var printsToApply = footprintBuffer[regionName].buffer;
	footprintBuffer[regionName].buffer = [];
	footprintBuffer[regionName].locked = true;

	generateMissingRegions(regionName, function () {
		query('select region_data from regions where region_name = $1', [regionName], function (error, result) {
			if (error) {
				debug("error for region: " + regionName);
				throw error;
			}

			var compressedData = result.rows[0].region_data;
			zlib.unzip(compressedData, function (err, regionData) {
				if (err) {
					debug("error for region: " + regionName);
					throw err;
				}

				try {
					regionData = JSON.parse(regionData);
				} catch (error) {
					debug("error for region: " + regionName + " with regionData: " + regionData);
					throw error;
				}

				applyPrintsToRegion(printsToApply, regionName, regionData);

				regionData = JSON.stringify(regionData);
				zlib.gzip(regionData, function (error, compressedData) {
					if (error) {
						throw error;
					}

					query('update regions set region_data = $2 where region_name = $1', [regionName, compressedData], function (error) {
						if (error) {
							throw error;
						}

						footprintBuffer[regionName].locked = false;
						footprintBuffer[regionName].lastFlushTimestamp = Date.now();

						if (footprintBuffer[regionName].buffer.length > 0) {
							setTimeout(flushFootprintBuffer(regionName), 10000);
						}
					});
				});
			});
		});
	});
}

function applyPrintsToRegion(prints, regionName, regionData) {
	var ignoredPrints = "";
	prints.forEach(function (print) {
		var notInReservedArea = true;
		for (var id in reservedAreas) {
			if (reservedAreas.hasOwnProperty(id)) {
				var path = reservedAreas[id];
				if (pointInsidePolygon(print.location, path)) {
					notInReservedArea = false;
					break;
				}
			}
		}

		if (notInReservedArea) {
			var region = new RegionNode(regionName);
			brushes[print.brush].apply(
				regionData,
				globalFunctions.toLocalCoordinates(print.location, region),
				print.additionalData
			);
		} else {
			ignoredPrints += "(" + print.location.x + ", " + print.location.y + "), ";
		}
	});

	if (ignoredPrints.length !== 0) {
		debug("footprints: " + ignoredPrints + " are inside a reserved area. Not writing them to disk.");
	}
}

module.exports = processFootprint;
