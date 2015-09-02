var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.brushes = (function () {
	var painting = (function () {
		var name = "painting";
		var frequency = 4;
		var radius = 6;

		// a buffer containing all previous strokes from the current elephant path
		// used to make sure the painting doesn't overlap itself
		var previousStrokeBuffer = {};

		function apply(regionData, positionOnCanvas, additionalData) {
			if (additionalData.resetBuffer) {
				previousStrokeBuffer = {};
			}

			radius = additionalData.radius;
			var darkenBy = additionalData.opacity;

			darkenSand(regionData, positionOnCanvas, darkenBy);
		}

		function darkenSand(regionData, positionOnCanvas, darkenBy) {
			var sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
			var pointOfImpact = {
				x: Math.floor(positionOnCanvas.x / sandGrainWidth),
				y: Math.floor(positionOnCanvas.y / sandGrainWidth)
			};

			var bounds = computeBounds(pointOfImpact, radius);

			for (var y = bounds.bottom; y < bounds.top; y++) {
				for (var x = bounds.left; x < bounds.right; x++) {
					var distanceFromCenter = sand.globalFunctions.calculateDistance(pointOfImpact, {x: x, y: y});
					if (distanceFromCenter < radius) {
						if (!previousStrokeBuffer[x + "_" + y]) {
							regionData[y][x][1] += darkenBy;
						}

						previousStrokeBuffer[x + "_" + y] = true;
					}
				}
			}
		}

		return {
			name: name,
			frequency: frequency,
			radius: radius,
			apply: apply
		}
	})();

	var walking = (function () {
		var radius = 1.5;

		function apply(regionData, positionOnCanvas) {
			imprintSphere(
				regionData,
				positionOnCanvas,
				radius,
				0,
				false
			)
		}

		return {
			name: "walking",
			frequency: 15,
			radius: radius,
			apply: apply
		}
	})();

	var shovelIn = (function () {
		var radius = 5;

		function apply(regionData, positionOnCanvas) {
			imprintSphere(
				regionData,
				positionOnCanvas,
				radius,
				1.5,
				false
			)
		}

		return {
			name: "shovelIn",
			radius: radius,
			apply: apply
		}
	})();

	var shovelOut = (function () {
		var radius = 5;

		function apply(regionData, positionOnCanvas) {
			imprintSphere(
				regionData,
				positionOnCanvas,
				radius,
				1.5,
				true
			)
		}

		return {
			name: "shovelOut",
			radius: radius,
			apply: apply
		}
	})();

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
	function imprintSphere(regionData, positionOnCanvas, radius, pointOfImpactZ, emboss) {
		var sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
		var pointOfImpact = {
			x: Math.floor(positionOnCanvas.x / sandGrainWidth),
			y: Math.floor(positionOnCanvas.y / sandGrainWidth),
			z: pointOfImpactZ
		};

		var bounds = computeBounds(pointOfImpact, radius);
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
					if (emboss === true) {
						regionData[y][x][0] += Math.floor(newZ);
					} else {
						regionData[y][x][0] -= Math.floor(newZ);
					}
				}
			}
		}
	}

	function computeBounds(pointOfImpact, radius) {
		return {
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
	}

	return {
		painting: painting,
		walking: walking,
		shovelIn: shovelIn,
		shovelOut: shovelOut
	}
})();

var module = module || {};
module.exports = sand.brushes;