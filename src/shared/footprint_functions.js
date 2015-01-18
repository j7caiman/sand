var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.modifyRegion = sand.modifyRegion || {};

sand.modifyRegion.brushes = {
	painting: {
		radius: 8,
			pointOfImpact: 2
	},

	walking: {
		radius: 1.5,
			pointOfImpact: 0
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
 */
sand.modifyRegion.imprintSphere = function (regionData, positionOnCanvas, radius, pointOfImpactZ) {
	const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
	var pointOfImpact = {
		x: Math.floor(positionOnCanvas.x / sandGrainWidth),
		y: Math.floor(positionOnCanvas.y / sandGrainWidth),
		z: pointOfImpactZ
	};

	const regionWidth = sand.constants.kRegionWidth;
	for (var y = 0; y < regionWidth; y++) {
		for (var x = 0; x < regionWidth; x++) {
			var localCoordinates = {
				x: x,
				y: y,
				z: regionData[y][x]
			};

			var delta = {
				x: localCoordinates.x - pointOfImpact.x,
				y: localCoordinates.y - pointOfImpact.y
			};

			var newZ = Math.sqrt(radius * radius - ( delta.x * delta.x + delta.y * delta.y )) - pointOfImpact.z;
			if (newZ > 0) {
				regionData[y][x] -= Math.floor(newZ);
			}
		}
	}
};

var module = module || {};
module.exports = sand.modifyRegion;