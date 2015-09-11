var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./global_functions");
sand.constants = sand.constants || require("./global_constants");

sand.brushes = (function () {
	var painting = (function () {
		// a buffer containing all previous strokes from the current elephant path
		// used to make sure the painting doesn't overlap itself
		var previousStrokeBuffer = {};

		function applyBrush(regionData, positionOnCanvas, additionalData) {
			if (additionalData.resetBuffer) {
				previousStrokeBuffer = {};
			}

			darkenSand(regionData, positionOnCanvas, additionalData.radius, additionalData.opacity);
		}

		function darkenSand(regionData, positionOnCanvas, radius, darkenBy) {
			var pointOfImpact = {
				x: Math.floor(positionOnCanvas.x / sand.constants.kSandGrainWidth),
				y: Math.floor(positionOnCanvas.y / sand.constants.kSandGrainWidth)
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
			name: "painting",
			frequency: 4,
			applyBrush: applyBrush
		}
	})();

	var walking = (function () {
		var radius = 1.5;

		function applyBrush(regionData, positionOnCanvas) {
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
			applyBrush: applyBrush
		}
	})();

	var shovelIn = (function () {
		var radius = 5;

		function applyBrush(regionData, positionOnCanvas) {
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
			applyBrush: applyBrush
		}
	})();

	var shovelOut = (function () {
		var radius = 5;

		function applyBrush(regionData, positionOnCanvas, additionalData) {
			imprintSphere(
				regionData,
				positionOnCanvas,
				radius,
				1.5,
				true
			);

			if (additionalData.shovelOutCallback !== undefined) {
				var pointOfImpact = {
					x: Math.floor(positionOnCanvas.x / sand.constants.kSandGrainWidth),
					y: Math.floor(positionOnCanvas.y / sand.constants.kSandGrainWidth)
				};

				if (pointOfImpact.x > 0
					&& pointOfImpact.y > 0
					&& pointOfImpact.x < sand.constants.kRegionWidth
					&& pointOfImpact.y < sand.constants.kRegionWidth
				) {
					var digDepth = regionData[pointOfImpact.y][pointOfImpact.x][0];
					additionalData.shovelOutCallback(digDepth);
				}
			}
		}

		return {
			name: "shovelOut",
			radius: radius,
			applyBrush: applyBrush
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
		var pointOfImpact = {
			x: Math.floor(positionOnCanvas.x / sand.constants.kSandGrainWidth),
			y: Math.floor(positionOnCanvas.y / sand.constants.kSandGrainWidth),
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

	function getRadiusForPrint(print) {
		if (print.additionalData !== undefined && print.additionalData.radius !== undefined) {
			return print.additionalData.radius;
		} else {
			return sand.brushes[print.brush].radius;
		}
	}

	return {
		painting: painting,
		walking: walking,
		shovelIn: shovelIn,
		shovelOut: shovelOut,
		getRadiusForPrint: getRadiusForPrint
	}
})();

var module = module || {};
module.exports = sand.brushes;