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

sand.globalFunctions.findRegionNameFromAbsolutePosition = function (position) {
	var xCoordinate = Math.floor(position.x / sand.constants.kCanvasWidth);
	var yCoordinate = Math.floor(position.y / sand.constants.kCanvasWidth);
	return xCoordinate + "_" + yCoordinate;
};

sand.globalFunctions.createBoundingBox = function (centerPoint, radius) {
	return {
		x: centerPoint.x - radius,
		y: centerPoint.y - radius,
		width: 2 * radius,
		height: 2 * radius
	};
};

/**
 * returns an array of region names that are inside the bounding rectangle
 * array is organized from lowest to highest, first by the y coordinate,
 * then by the x coordinate.
 */
sand.globalFunctions.findRegionsInRect = function (rect) {
	var xCoordinates = [];
	for (var x = rect.x; x < rect.x + rect.width; x += sand.constants.kCanvasWidth) {
		xCoordinates.push(x);
	}
	xCoordinates.push(rect.x + rect.width);

	var yCoordinates = [];
	for (var y = rect.y; y < rect.y + rect.height; y += (sand.constants.kCanvasWidth)) {
		yCoordinates.push(y);
	}
	yCoordinates.push(rect.y + rect.height);

	var coordinates = [];
	for (y = 0; y < yCoordinates.length; y++) {
		for (x = 0; x < xCoordinates.length; x++) {
			coordinates.push({
				x: xCoordinates[x],
				y: yCoordinates[y]
			})
		}
	}

	var regionNames = [];
	for (var i = 0; i < coordinates.length; i++) {
		var item = sand.globalFunctions.findRegionNameFromAbsolutePosition(coordinates[i]);
		if (regionNames.indexOf(item) == -1) {
			regionNames.push(item);
		}
	}

	return regionNames;
};


var module = module || {};
module.exports = sand.globalFunctions;