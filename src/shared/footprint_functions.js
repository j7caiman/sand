var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.modifyRegion = sand.modifyRegion || {};

sand.modifyRegion.brushes = {
	painting: [
		{
			frequency: 7,
			radius: 6,
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
			radius: 6,
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
	}]
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
				z: regionData[y][x]
			};

			var delta = {
				x: localCoordinates.x - pointOfImpact.x,
				y: localCoordinates.y - pointOfImpact.y
			};

			var newZ = Math.sqrt(radius * radius - ( delta.x * delta.x + delta.y * delta.y )) - pointOfImpact.z;
			if (newZ > 0) {
				if(emboss === true) {
					regionData[y][x] += Math.floor(newZ);
				} else {
					regionData[y][x] -= Math.floor(newZ);
				}
			}
		}
	}
};

var module = module || {};
module.exports = sand.modifyRegion;