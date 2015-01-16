var sand = sand || {};
var require = require || function(){};
sand.constants = sand.constants || require("./global_constants");
sand.globalFunctions = sand.globalFunctions || {};

/**
 * In this case, local coordinates refers to the point's location relative to the bottom left
 * corner of the region.
 *
 * Note: sand.currentRegion is not defined on the server, so
 * when calling it from the server, pass in a region.
 */
sand.globalFunctions.toLocalCoordinates = function (point, region) {
	if (region === undefined) { // region is an optional parameter
		if (sand.currentRegion === undefined) {
			throw "sand.currentRegion undefined.\nIs this function being called improperly from the server?"
		} else {
			region = sand.currentRegion;
		}
	}
	return {
		x: point.x - (region.x * sand.constants.kCanvasWidth),
		y: point.y - (region.y * sand.constants.kCanvasWidth)
	}
};

sand.globalFunctions.toGlobalCoordinates = function (point, region) {
	if (region === undefined) { // region is an optional parameter
		if (sand.currentRegion === undefined) {
			throw "sand.currentRegion undefined.\nIs this function being called improperly from the server?"
		} else {
			region = sand.currentRegion;
		}
	}

	return {
		x: point.x + (region.x * sand.constants.kCanvasWidth),
		y: point.y + (region.y * sand.constants.kCanvasWidth)
	}
};

sand.globalFunctions.getRegionZipCode = function (regionName) {
	var coordinates = regionName.split("_");
	return Math.floor(coordinates[0] / sand.constants.kZipCodeWidth)
		+ "_" + Math.floor(coordinates[1] / sand.constants.kZipCodeWidth);
};

var module = module || {};
module.exports = sand.globalFunctions;