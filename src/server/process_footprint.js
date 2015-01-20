var fs = require('fs');
var globalFunctions = require('../shared/global_functions');
var footprintFunctions = require('../shared/footprint_functions');
var RegionNode = require('../shared/RegionNode');

var footprintBuffer = {};

function processFootprint(footprintData) {
	var area = globalFunctions.createBoundingBox(
		footprintData.location,
		footprintFunctions.brushes[footprintData.brush].radius
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
			_flushFootprintBuffer(regionName);
		}
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
			throw err;
		}

		regionData = JSON.parse(regionData);
		footprintsToFlush.forEach(function (print) {
			footprintFunctions.imprintSphere(
				regionData,
				globalFunctions.toLocalCoordinates(print.location, region),
				footprintFunctions.brushes[print.brush].radius,
				footprintFunctions.brushes[print.brush].pointOfImpact
			);
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
	});
}

module.exports = processFootprint;
