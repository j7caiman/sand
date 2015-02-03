var fs = require('fs');
var globalFunctions = require('../shared/global_functions');
var footprintFunctions = require('../shared/footprint_functions');
var RegionNode = require('../shared/RegionNode');
var regionFunctions = require('./region_functions');

var footprintBuffer = {};

function processFootprint(footprintData) {
	var brush = footprintFunctions.brushes[footprintData.brush];
	brush.forEach(function(brushComponent) {
		var computedLocation = {
			x: footprintData.location.x,
			y: footprintData.location.y
		};
		if(brushComponent.offset !== undefined) {
			computedLocation.x = brushComponent.offset.x + footprintData.location.x;
			computedLocation.y = brushComponent.offset.y + footprintData.location.y;
		}

		var area = globalFunctions.createBoundingBox(
			computedLocation,
			brushComponent.radius
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
			footprintBuffer[regionName].buffer.push({
				location: computedLocation,
				brush: brushComponent
			});

			if (!footprintBuffer[regionName].locked) {
				_flushFootprintBuffer(regionName);
			}
		});
	});
}

function _flushFootprintBuffer(regionName) {
	if (footprintBuffer[regionName].buffer.length === 0
		|| footprintBuffer[regionName].locked) {
		return;
	}

	var footprintsToFlush = footprintBuffer[regionName].buffer;
	footprintBuffer[regionName].buffer = [];
	footprintBuffer[regionName].locked = true;

	var region = new RegionNode(regionName);
	var zipCode = globalFunctions.getRegionZipCode(regionName);
	var path = './resources/world_datastore/z' + zipCode + '/r' + regionName + '.json';
	fs.readFile(path, 'utf8', function (err, regionData) {
		if (err) {
			// this can happen if a client is running, but the regions it's writing to have been deleted
			if(err.code == 'ENOENT') {
				regionFunctions.generateRegions([regionName], function() {
					fs.readFile(path, 'utf8', function (err, regionData) {
						if (err) {
							throw err;
						}

						_writeFootprintsToRegion(regionData);
					});
				});
			} else {
				throw err;
			}
		} else {
			_writeFootprintsToRegion(regionData);
		}

		function _writeFootprintsToRegion(regionData) {
			try {
				regionData = JSON.parse(regionData);
			} catch (error) {
				var zipCode = globalFunctions.getRegionZipCode(regionName);
				debug("error for region: z" + zipCode + "/r" + regionName);
				debug("regionData: " + regionData);
				throw error;
			}

			footprintsToFlush.forEach(function (print) {
				print.brush.apply(regionData, globalFunctions.toLocalCoordinates(print.location, region));
			});

			fs.writeFile(path, JSON.stringify(regionData), function (err) {
				if (err) {
					throw err;
				}

				footprintBuffer[regionName].locked = false;
				footprintBuffer[regionName].lastFlushTimestamp = Date.now();

				if (footprintBuffer[regionName].buffer.length > 0) {
					setTimeout(_flushFootprintBuffer(regionName), 10000);
				}
			});
		}



	});
}

module.exports = processFootprint;
