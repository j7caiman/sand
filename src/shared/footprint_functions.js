var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.modifyRegion = sand.modifyRegion || {};

sand.modifyRegion.brushes = {
	painting: {
		name: "painting",
		frequency: 7,
		radius: 6,
		apply: function(regionData, positionOnCanvas) {
			sand.modifyRegion.darkenSand(
				regionData,
				positionOnCanvas,
				6
			)
		}
	},

	walking: {
		name: "walking",
		frequency: 15,
		radius: 1.5,
		apply: function(regionData, positionOnCanvas) {
			sand.modifyRegion.imprintSphere(
				regionData,
				positionOnCanvas,
				1.5,
				0,
				false
			)
		}
	},

	shovelIn: {
		name: "shovelIn",
		radius: 5,
		apply: function(regionData, positionOnCanvas) {
			sand.modifyRegion.imprintSphere(
				regionData,
				positionOnCanvas,
				5,
				1.5,
				false
			)
		}
	},

	shovelOut: {
		name: "shovelOut",
		radius: 5,
		apply: function(regionData, positionOnCanvas) {
			sand.modifyRegion.imprintSphere(
				regionData,
				positionOnCanvas,
				5,
				1.5,
				true
			)
		}
	}
};

sand.modifyRegion.darkenSand = function (regionData, positionOnCanvas, radius) {
	var sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
	var pointOfImpact = {
		x: Math.floor(positionOnCanvas.x / sandGrainWidth),
		y: Math.floor(positionOnCanvas.y / sandGrainWidth)
	};

	var bounds = {
		left: Math.max(
			0, Math.floor(pointOfImpact.x - radius)
		),
		right: Math.min(
			sand.constants.kRegionWidth, Math.ceil(pointOfImpact.x + radius)
		),
		bottom: Math.max(
			0, Math.floor(pointOfImpact.y - radius)
		),
		top: Math.min(
			sand.constants.kRegionWidth, Math.ceil(pointOfImpact.y + radius)
		)
	};

	if (sand.modifyRegion.darkenSand.counter++ > 500) {
		sand.modifyRegion.darkenSand.counter = 0;
		sand.modifyRegion.darkenSand.previousFootprintBuffer = {};
	}

	for (var y = bounds.bottom; y < bounds.top; y++) {
		for (var x = bounds.left; x < bounds.right; x++) {
			var distanceFromCenter = sand.globalFunctions.calculateDistance(pointOfImpact, {x: x, y: y});
			if (distanceFromCenter < radius) {

				if (!sand.modifyRegion.darkenSand.previousFootprintBuffer[x + "_" + y]) {
					regionData[y][x][1]++;
				}

				sand.modifyRegion.darkenSand.previousFootprintBuffer[x + "_" + y] = true;
			}
		}
	}
};
sand.modifyRegion.darkenSand.previousFootprintBuffer = {};
sand.modifyRegion.darkenSand.counter = 0;

/**
 * crater is shaped as follows:
 *
 *
 * - -     -                                 -      - ----------
 *          -                              -
 *             ---__              __ --
 *                    ' --------
 *
 * radius: radius of entire element
 * pointOfImpact: the height at which the sphere which forms the crater is located
 *  - note that in the diagram above, pointOfImpact would be located slightly above the word "follows"
 *
 * emboss: if true, raises the ground instead of lowering it
 */
sand.modifyRegion.imprintSphere = function (regionData, positionOnCanvas, radius, pointOfImpactZ, emboss) {
	var sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
	var pointOfImpact = {
		x: Math.floor(positionOnCanvas.x / sandGrainWidth),
		y: Math.floor(positionOnCanvas.y / sandGrainWidth),
		z: pointOfImpactZ
	};

	var bounds = {
		left: Math.max(
			0, Math.floor(pointOfImpact.x - radius)
		),
		right: Math.min(
			sand.constants.kRegionWidth, Math.ceil(pointOfImpact.x + radius)
		),
		bottom: Math.max(
			0, Math.floor(pointOfImpact.y - radius)
		),
		top: Math.min(
			sand.constants.kRegionWidth, Math.ceil(pointOfImpact.y + radius)
		)
	};

	for (var y = bounds.bottom; y < bounds.top; y++) {
		for (var x = bounds.left; x < bounds.right; x++) {
			var localCoordinates = {
				x: x,
				y: y,
				z: regionData[y][x][0]
			};

			var delta = {
				x: localCoordinates.x - pointOfImpact.x,
				y: localCoordinates.y - pointOfImpact.y
			};

			var newZ = Math.sqrt(radius * radius - ( delta.x * delta.x + delta.y * delta.y )) - pointOfImpact.z;
			if (newZ > 0) {
				if(emboss === true) {
					regionData[y][x][0] += Math.floor(newZ);
				} else {
					regionData[y][x][0] -= Math.floor(newZ);
				}
			}
		}
	}
};

var module = module || {};
module.exports = sand.modifyRegion;