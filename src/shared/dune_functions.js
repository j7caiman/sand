var sand = sand || {};
var require = require || function(){};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.modifyRegion = sand.modifyRegion || {};
sand.modifyRegion.listRegionNamesInZipCode = function (zipCode) {
	var zipCodeWidth = sand.constants.kZipCodeWidth;

	var regionNamesToCreate = [];
	for (var x = 0; x < zipCodeWidth; x++) {
		for (var y = 0; y < zipCodeWidth; y++) {
			var coordinates = {};
			coordinates.x = (zipCode.split("_")[0] * zipCodeWidth) + x;
			coordinates.y = (zipCode.split("_")[1] * zipCodeWidth) + y;
			regionNamesToCreate.push(coordinates.x + "_" + coordinates.y);
		}
	}
	return regionNamesToCreate;
};

sand.modifyRegion.generateLargeDune = function (regions) {
	var zipCodeWidth = sand.constants.kZipCodeWidth;

	var bottomRightRegion = regions[zipCodeWidth - 1];
	var topLeftRegion = regions[(zipCodeWidth * zipCodeWidth) - zipCodeWidth];

	var begin = sand.globalFunctions.toGlobalCoordinates(
		{
			x: sand.constants.kCanvasWidth / 2,
			y: sand.constants.kCanvasWidth / 2
		},
		bottomRightRegion
	);

	var end = sand.globalFunctions.toGlobalCoordinates(
		{
			x: sand.constants.kCanvasWidth / 2,
			y: sand.constants.kCanvasWidth / 2
		},
		topLeftRegion
	);

	var bezier = this._generateWindingCurve(begin, end, 1);

	regions.forEach(function (region) {
		this._inscribeDuneToRegion(bezier, region);
	}, this);
};

sand.modifyRegion.generateBumps = function (regions) {
	var numTrails;
	var heightRange;
	var addOntoDunes;

	regions.forEach(function (region) {
		numTrails = 5000 / 16;
		heightRange = {min: 0.5, max: 2};
		addOntoDunes = true;
		this._generateBumpsForHeightRange(numTrails, region, heightRange, addOntoDunes);

		numTrails = 1000 / 16;
		heightRange = {min: 2, max: 3};
		addOntoDunes = false;
		this._generateBumpsForHeightRange(numTrails, region, heightRange, addOntoDunes);


		numTrails = 100 / 16;
		heightRange = {min: 2, max: 6};
		addOntoDunes = false;
		this._generateBumpsForHeightRange(numTrails, region, heightRange, addOntoDunes);
	}, this);
};

sand.modifyRegion._generateBumpsForHeightRange = function (numBumps, region, heightRange, addToDunes) {
	for (var i = 0; i < numBumps; i++) {
		var location = {
			x: this._getRandomFloat(0, sand.constants.kCanvasWidth),
			y: this._getRandomFloat(0, sand.constants.kCanvasWidth)
		};
		var height = this._getRandomFloat(heightRange.min, heightRange.max);
		this._createCone(region.getData(), location, height, addToDunes);
	}
};

sand.modifyRegion._generateWindingCurve = function (begin, end) {
	var angle = Math.atan2(end.y - begin.y, end.x - begin.x);
	var duneCurveMultiplier = 2000;
	var angleBuffer = 0.8; // prevents generated dunes from running off screen

	var cp1Offset = this._getRandomCoordinateWithinCircleSector(
		angle - Math.PI/2 + angleBuffer,
		angle + Math.PI/2 - angleBuffer,
		duneCurveMultiplier
	);
	var cp1 = {
		x: cp1Offset.x + begin.x,
		y: cp1Offset.y + begin.y
	};

	var cp2Offset = this._getRandomCoordinateWithinCircleSector(
		angle + Math.PI/2 + angleBuffer,
		angle + 3 * Math.PI/2 - angleBuffer,
		duneCurveMultiplier
	);
	var cp2 = {
		x: cp2Offset.x + end.x,
		y: cp2Offset.y + end.y
	};

	return this._createBezierFunction(begin, cp1, cp2, end);
};

sand.modifyRegion._getRandomCoordinateWithinCircleSector = function (minAngle, maxAngle, radius) {
	var angle = this._getRandomFloat(minAngle, maxAngle);
	var u = Math.random() + Math.random(); //ensures uniform distribution within circle (http://stackoverflow.com/a/5838055)
	var offset = (u > 1) ? (2 - u) : u;
	return {
		x: offset * Math.cos(angle) * radius,
		y: offset * Math.sin(angle) * radius
	};
};

sand.modifyRegion._getRandomFloat = function (min, max) { // returns a number inclusive of 'min' and exclusive of 'max'
	return Math.random() * (max - min) + min;
};

sand.modifyRegion._createBezierFunction = function (begin, cp1, cp2, end) {
	function square(x) {
		return x * x;
	}

	function cube(x) {
		return x * x * x;
	}

	// basic functions for the range t in [0,1]
	function b0_t(t) {
		return cube(1 - t);
	}

	function b1_t(t) {
		return 3 * t * square(1 - t);
	}

	function b2_t(t) {
		return 3 * square(t) * (1 - t);
	}

	function b3_t(t) {
		return cube(t);
	}

	return function (t) {
		return {
			x: (b0_t(t) * begin.x) + (b1_t(t) * cp1.x) + (b2_t(t) * cp2.x) + (b3_t(t) * end.x),
			y: (b0_t(t) * begin.y) + (b1_t(t) * cp1.y) + (b2_t(t) * cp2.y) + (b3_t(t) * end.y)
		}
	};
};

sand.modifyRegion._inscribeDuneToRegion = function (dunePath, region) {
	var samplePeriod = 0.005;
	for (var t = 0; t <= 1; t += samplePeriod) {
		var positionOfCone = sand.globalFunctions.toLocalCoordinates(dunePath(t), region);
		var height = this._determineHeightOfCone(t);
		this._createCone(region.getData(), positionOfCone, height, false);
	}
};

/**
 * a 3 part function which roughly forms this shape:
 *
 * f(t)
 * ^
 * |  _______
 * | /       \
 * |/         \
 * +-------------> h
 *
 *
 * The maximum height of this function is 'maxHeight'.
 *
 * If the sand dune's path were a straight line, and the position at every sample point was uniformly
 * distributed, the slope of the line would be equal to heightDelta / (length of sand dune).
 * However, the length of the dune is unknown and points are not uniformly distributed.
 *
 * So, heightDelta is more of a suggestion on how fast the dune should approach its maximum height
 */
sand.modifyRegion._determineHeightOfCone = function (t) {
	var maxHeight = 1000;
	var heightDelta = 200;

	if (t < 0.5) {
		return Math.min(maxHeight, heightDelta * t);
	} else {
		return Math.min(maxHeight, heightDelta * (1 - t));
	}
};

sand.modifyRegion._createCone = function (regionData, positionOnCanvas, highestPoint, isAdditive) {
	var angleOfRepose = Math.PI / 4;
	var sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
	var positionOnRegion = {
		x: Math.floor(positionOnCanvas.x / sandGrainWidth),
		y: Math.floor(positionOnCanvas.y / sandGrainWidth),
		z: highestPoint
	};

	//optimization: only iterate over the bounding box
	var radiusOfCone = (highestPoint / Math.tan(angleOfRepose));
	var bounds = {
		left: Math.max(
			0, Math.floor(positionOnRegion.x - radiusOfCone)
		),
		right: Math.min(
			sand.constants.kRegionWidth, Math.ceil(positionOnRegion.x + radiusOfCone)
		),
		bottom: Math.max(
			0, Math.floor(positionOnRegion.y - radiusOfCone)
		),
		top: Math.min(
			sand.constants.kRegionWidth, Math.ceil(positionOnRegion.y + radiusOfCone)
		)
	};

	for (var y = bounds.bottom; y < bounds.top; y++) {
		for (var x = bounds.left; x < bounds.right; x++) {
			var lateralDistance = sand.globalFunctions.calculateDistance({x: x, y: y}, positionOnRegion);

			var height = Math.floor(positionOnRegion.z - Math.tan(angleOfRepose) * lateralDistance);
			if (regionData[y] !== undefined && height > 0) {
				if (isAdditive) {
					regionData[y][x][0] += height;
				} else if (height > regionData[y][x][0]) {
					regionData[y][x][0] = height;
				}
			}
		}
	}
};

var module = module || {};
module.exports = sand.modifyRegion;