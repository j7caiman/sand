var debug = require('debug')('sand');

var reservedAreas = require('./caches').getReservedAreas();
var alterRegion = require('./alter_region');

var globalFunctions = require('../shared/global_functions');
var brushes = require('../shared/footprint_functions');
var RegionNode = require('../shared/RegionNode');
var pointInsidePolygon = require('../shared/shared_rock_functions').pointInsidePolygon;

var footprintBuffers = {};

function processFootprint(footprintData) {
	var area = globalFunctions.createBoundingBox(
		footprintData.location,
		brushes[footprintData.brush].radius
	);

	var regionNames = globalFunctions.findRegionsInRect(area);
	regionNames.forEach(function (regionName) {
		if (footprintBuffers[regionName] === undefined) {
			footprintBuffers[regionName] = {
				buffer: [],
				locked: false
			};
		}

		footprintBuffers[regionName].buffer.push(footprintData);

		tryFlushPrintBuffer(regionName);
	});
}

function tryFlushPrintBuffer(regionName) {
	if (footprintBuffers[regionName].buffer.length === 0) {
		return;
	} else if (footprintBuffers[regionName].locked) {
		return;
	}

	var printsToApply = footprintBuffers[regionName].buffer;
	footprintBuffers[regionName].buffer = [];
	footprintBuffers[regionName].locked = true;

	alterRegion(regionName, transformFunction, onSuccess);

	function transformFunction(regionData) {
		applyPrintsToRegion(printsToApply, regionName, regionData);
	}

	function onSuccess() {
		footprintBuffers[regionName].locked = false;

		if (footprintBuffers[regionName].buffer.length > 0) {
			setTimeout(tryFlushPrintBuffer(regionName), 10000);
		}
	}
}

function applyPrintsToRegion(prints, regionName, regionData) {
	var excludedPrints = [];
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
			brushes[print.brush].applyBrush(
				regionData,
				globalFunctions.toLocalCoordinates(print.location, region),
				print.additionalData
			);
		} else {
			excludedPrints.push(print.location);
		}
	});

	if (excludedPrints.length !== 0) {
		debug("footprints: "
			+ JSON.stringify(excludedPrints)
			+ " are inside a reserved area in region: "
			+ regionName
			+ ". Not writing them to disk.");
	}
}

module.exports = processFootprint;
