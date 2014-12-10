sand.modifyRegion = {
	makeFootprint: function (changedArea, globalPosition) {
		var regionNames = sand.globalFunctions.findRegionsInRect(changedArea);
		regionNames.forEach(function(regionName) {
			var region = sand.allRegions[regionName];
			// region not guaranteed to be loaded, since the rectangle may reference an area beyond the player
			if(region !== undefined) {
				var localPosition = sand.globalFunctions.toLocalCoordinates(globalPosition, region);
				sand.modifyRegion.imprintSphere(region.getData(), localPosition, 12);
			}
		});
	},

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
	imprintSphere: function (regionData, positionOnCanvas, radius) {
		const pointOfImpactZ = 4;

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

				// radius = sqrt((x1-x0)^2 + (y1-y0)^2 + (z1-z0)^2)
				// z1     = sqrt(radius^2 - ( (x1-x0)^2 + (y1-y0)^2 )) + z0
				var newZ = -Math.sqrt(radius * radius - ( delta.x * delta.x + delta.y * delta.y )) + pointOfImpact.z;
				if (newZ < 0) {
					regionData[y][x] -= Math.floor(newZ);
				}
			}
		}
	},

	settle: function () {
		var regionData = sand.currentRegion.getData();

		const gridWidth = regionData[0].length;
		for (var y = 1; y < gridWidth - 1; y++) {
			for (var x = 1; x < gridWidth - 1; x++) {
				var currentLocation = {x: x, y: y}; //note: is not the center of the block
				var currentDepth = regionData[currentLocation.y][currentLocation.x];
				var topAdjacentDepth = regionData[currentLocation.y - 1][currentLocation.x];
				var rightAdjacentDepth = regionData[currentLocation.y][currentLocation.x + 1];
				var bottomAdjacentDepth = regionData[currentLocation.y + 1][currentLocation.x];
				var leftAdjacentDepth = regionData[currentLocation.y][currentLocation.x - 1];

				var depths = [
					{label: "current", depth: currentDepth},
					{label: "top", depth: topAdjacentDepth},
					{label: "right", depth: rightAdjacentDepth},
					{label: "bottom", depth: bottomAdjacentDepth},
					{label: "left", depth: leftAdjacentDepth}
				];
				depths.sort(function (first, second) {
					return first.depth - second.depth;
				});

				var lowestPoint = depths[0];

				if (currentDepth > lowestPoint.depth + 2) {
					regionData[currentLocation.y][currentLocation.x]--;
					switch (lowestPoint.label) {
						case "top":
							regionData[currentLocation.y - 1][currentLocation.x]++;
							break;
						case "right":
							regionData[currentLocation.y][currentLocation.x + 1]++;
							break;
						case "bottom":
							regionData[currentLocation.y + 1][currentLocation.x]++;
							break;
						case "left":
							regionData[currentLocation.y][currentLocation.x - 1]++;
							break;
					}
				}
			}
		}
	},

	generateDunes: function() {
		(function zeroOutRegion(regionData, width) {
			for(var y = 0; y < width; y++) {
				for(var x = 0; x < width; x++) {
					regionData[y][x] = 0;
				}
			}
		})(sand.currentRegion.getData(), sand.constants.kRegionWidth);

		function createBezierFunction(begin, cp1, cp2, end) {
			function square(x) { return x * x; }
			function cube(x) { return x * x * x; }

			// basic functions for the range t in [0,1]
			function b0_t(t) { return cube(1-t); }
			function b1_t(t) { return 3 * t * square(1-t); }
			function b2_t(t) { return 3 * square(t) * (1-t); }
			function b3_t(t) { return cube(t); }

			return function (t) {
				return {
					x: (b0_t(t) * begin.x) + (b1_t(t) * cp1.x) + (b2_t(t) * cp2.x) + (b3_t(t) * end.x),
					y: (b0_t(t) * begin.y) + (b1_t(t) * cp1.y) + (b2_t(t) * cp2.y) + (b3_t(t) * end.y)
				}
			};
		}

		function getRandomInt(min, max) { // returns a number inclusive of 'min' and exclusive of 'max'
			return Math.floor(Math.random() * (max - min)) + min;
		}

		for(var i = 0; i < 9; i++) {
			var start = {
				x: getRandomInt(0, 512),
				y: getRandomInt(0, 512)
			};

			var controlPoint1 = {
				x: getRandomInt(0, 512),
				y: getRandomInt(0, 512)
			};

			var controlPoint2 = {
				x: getRandomInt(0, 512),
				y: getRandomInt(0, 512)
			};

			var end = {
				x: getRandomInt(0, 512),
				y: getRandomInt(0, 512)
			};

			var bezier = createBezierFunction(start, controlPoint1, controlPoint2, end);
			sand.modifyRegion.generateDune(bezier);
		}

		sand.canvasUpdate.drawRegionToCanvas(sand.currentRegion);
	},

	generateDune: function (dunePath) {
		function createCone(regionData, positionOnCanvas, highestPoint) {
			const angleOfRepose = Math.PI / 4;
			const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
			var positionOnRegion = {
				x: Math.floor(positionOnCanvas.x / sandGrainWidth),
				y: Math.floor(positionOnCanvas.y / sandGrainWidth),
				z: highestPoint
			};

			//optimization: only iterate over the bounding box
			var radiusOfCone = (highestPoint / Math.tan(angleOfRepose));
			var bounds = {
				left: Math.floor(positionOnRegion.x - radiusOfCone),
				right: Math.ceil(positionOnRegion.x + radiusOfCone),
				bottom: Math.floor(positionOnRegion.y - radiusOfCone),
				top: Math.ceil(positionOnRegion.y + radiusOfCone)
			};

			for (var y = bounds.bottom; y < bounds.top; y++) {
				for (var x = bounds.left; x < bounds.right; x++) {
					var lateralDistance = (function(p1, p2) {
						var xDelta = p2.x - p1.x;
						var yDelta = p2.y - p1.y;
						return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
					})({x: x, y: y}, positionOnRegion);

					var height = Math.floor(positionOnRegion.z - Math.tan(angleOfRepose) * lateralDistance);
					if(regionData[y] !== undefined && height > 0 && height > regionData[y][x]) {
						regionData[y][x] = height;
					}
				}
			}
		}


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
		function determineHeightOfCone(t) {
			const maxHeight = 60;
			const heightDelta = 40;

			if(t < 0.5) {
				return Math.min(maxHeight, heightDelta * t);
			} else {
				return Math.min(maxHeight, heightDelta * (1 - t));
			}
		}

		const samplePeriod = 0.005;
		for(var t = 0; t <= 1; t += samplePeriod) {
			var positionOfCone = dunePath(t);
			var height = determineHeightOfCone(t);
			createCone(sand.currentRegion.getData(), positionOfCone, height);
		}
	}
};