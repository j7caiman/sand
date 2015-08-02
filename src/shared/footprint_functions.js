var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.modifyRegion = sand.modifyRegion || {};

sand.modifyRegion.brushes = {
	painting: [{
		frequency: 7,
		radius: 6,
		apply: function(regionData, positionOnCanvas) {
			sand.modifyRegion.darkenSand(
				regionData,
				positionOnCanvas,
				6
			)
		}
	}],

	digging: [
		{
			frequency: 7,
			radius: 4.5,
			apply: function(regionData, positionOnCanvas) {
				sand.modifyRegion.imprintSphere(
					regionData,
					positionOnCanvas,
					4.5,
					1,
					false
				)
			}
		},
		{
			radius: 5,
			offset: {
				x: -8.5,
				y: -2
			},
			apply: function(regionData, positionOnCanvas) {
				sand.modifyRegion.imprintSphere(
					regionData,
					positionOnCanvas,
					5,
					2,
					true
				)
			}
		}
	],

	walking: [{
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
	}],

	erasing: [{
		frequency: 7,
		radius: 10,
		apply: function(regionData, positionOnCanvas) {
			sand.modifyRegion.erase(regionData, positionOnCanvas, 10);
		}
	}]
};

sand.modifyRegion.darkenSand = function (regionData, positionOnCanvas, radius) {
	const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
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
 * flattens surrounding area, gradually bringing things to 0 height.
 */
sand.modifyRegion.erase = function (regionData, positionOnCanvas, radius) {
	const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
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

	for (var y = bounds.bottom; y < bounds.top; y++) {
		for (var x = bounds.left; x < bounds.right; x++) {
			var distanceFromCenter = sand.globalFunctions.calculateDistance(pointOfImpact, { x: x, y: y });
			if(distanceFromCenter < radius) {
				if (regionData[y][x][0] < 0) {
					regionData[y][x][0]++;
				} else if(regionData[y][x][0] > 0) {
					regionData[y][x][0]--;
				}
			}
		}
	}
};

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
	const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
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

			var distanceFromCenter = sand.globalFunctions.calculateDistance(pointOfImpact, { x: x, y: y });
			if(distanceFromCenter < radius) {
				if (regionData[y][x][0] < 0) {
					regionData[y][x][0]++;
				} else if(regionData[y][x][0] > 0) {
					regionData[y][x][0]--;
				}
			}
		}
	}
};

var module = module || {};
module.exports = sand.modifyRegion;