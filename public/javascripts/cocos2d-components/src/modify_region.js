sand.modifyRegion = {
	brushes: {
		painting: {
			radius: 8,
			pointOfImpact: 2
		},

		walking: {
			radius: 1.5,
			pointOfImpact: 0
		}
	},

	makeFootprint: function (changedArea, globalPosition, brush) {
		var regionNames = sand.globalFunctions.findRegionsInRect(changedArea);
		regionNames.forEach(function(regionName) {
			var region = sand.allRegions[regionName];
			// region not guaranteed to be loaded, since the rectangle may reference an area beyond the player
			if(region !== undefined) {
				sand.modifyRegion.imprintSphere(
					region.getData(),
					sand.globalFunctions.toLocalCoordinates(globalPosition, region),
					sand.modifyRegion.brushes[brush].radius,
					sand.modifyRegion.brushes[brush].pointOfImpact);
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
	imprintSphere: function (regionData, positionOnCanvas, radius, pointOfImpactZ) {
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

	regenerateTerrain: function () {
		var that = this;
		var zipCode = that._getRegionZipCode(sand.currentRegion.getName());
		var regionNames = that._listRegionsInZipCode(zipCode);

		sand.globalFunctions.addMoreRegions(onComplete, regionNames);

		function onComplete() {
			regionNames.forEach(function (regionName) {
				(function zeroOutRegion(regionData, width) {
					for (var y = 0; y < width; y++) {
						for (var x = 0; x < width; x++) {
							regionData[y][x] = 0;
						}
					}
				})(sand.allRegions[regionName].getData(), sand.constants.kRegionWidth);
			});

			var regions = regionNames.map(function (regionName) {
				return sand.allRegions[regionName];
			});

			that._generateLargeDune(regions);
			that._generateBumps(regions);
		}
	},

	_zipCodeWidth: 4,

	_generateBumps: function(regions) {
		var numTrails;
		var heightRange;
		var addOntoDunes;


		regions.forEach(function (region) {
			numTrails = 5000 / 16;
			heightRange = { min: 0.5, max: 2 };
			addOntoDunes = true;
			this._generateBumpsForHeightRange(numTrails, region, heightRange, addOntoDunes);

			numTrails = 1000 / 16;
			heightRange = { min: 2, max: 3 };
			addOntoDunes = false;
			this._generateBumpsForHeightRange(numTrails, region, heightRange, addOntoDunes);


			numTrails = 100 / 16;
			heightRange = { min: 2, max: 6 };
			addOntoDunes = false;
			this._generateBumpsForHeightRange(numTrails, region, heightRange, addOntoDunes);
		}, this);



		regions.forEach(function(region) {
			sand.canvasUpdate.drawRegionToCanvas(region);
		}, this);
	},

	_generateBumpsForHeightRange: function (numBumps, region, heightRange, addToDunes) {
		for (var i = 0; i < numBumps; i++) {
			var location = {
				x: this._getRandomFloat(0, sand.constants.kCanvasWidth),
				y: this._getRandomFloat(0, sand.constants.kCanvasWidth)
			};
			var height = this._getRandomFloat(heightRange.min, heightRange.max);
			this._createCone(region.getData(), location, height, addToDunes);
		}
	},

	_generateLargeDune: function(regions) {
		const zipCodeWidth = this._zipCodeWidth;

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

		regions.forEach(function(region) {
			this._inscribeDuneToRegion(bezier, region);
		}, this);
	},

	_getRegionZipCode: function (regionName) {
		var coordinates = regionName.split("_");
		return Math.floor(coordinates[0] / this._zipCodeWidth)
			+ "_" + Math.floor(coordinates[1] / this._zipCodeWidth);
	},

	_listRegionsInZipCode: function(zipCode) {
		const zipCodeWidth = this._zipCodeWidth;

		var regionsToCreate = [];
		for (var x = 0; x < zipCodeWidth; x++) {
			for (var y = 0; y < zipCodeWidth; y++) {
				var coordinates = {};
				coordinates.x = (zipCode.split("_")[0] * zipCodeWidth) + x;
				coordinates.y = (zipCode.split("_")[1] * zipCodeWidth) + y;
				regionsToCreate.push(coordinates.x + "_" + coordinates.y);
			}
		}
		return regionsToCreate;
	},

	_generateWindingCurve: function (begin, end) {
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
	},

	_getRandomCoordinateWithinCircleSector: function (minAngle, maxAngle, radius) {
		var angle = this._getRandomFloat(minAngle, maxAngle);
		var u = Math.random() + Math.random(); //ensures uniform distribution within circle (http://stackoverflow.com/a/5838055)
		var offset = (u > 1) ? (2 - u) : u;
		return {
			x: offset * Math.cos(angle) * radius,
			y: offset * Math.sin(angle) * radius
		};
	},

	_getRandomFloat: function (min, max) { // returns a number inclusive of 'min' and exclusive of 'max'
		return Math.random() * (max - min) + min;
	},

	_createBezierFunction: function (begin, cp1, cp2, end) {
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
	},

	_inscribeDuneToRegion: function (dunePath, region) {
		const samplePeriod = 0.005;
		for(var t = 0; t <= 1; t += samplePeriod) {
			var positionOfCone = sand.globalFunctions.toLocalCoordinates(dunePath(t), region);
			var height = this._determineHeightOfCone(t);
			this._createCone(region.getData(), positionOfCone, height, false);
		}
	},

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
	_determineHeightOfCone: function(t) {
		const maxHeight = 1000;
		const heightDelta = 200;

		if(t < 0.5) {
			return Math.min(maxHeight, heightDelta * t);
		} else {
			return Math.min(maxHeight, heightDelta * (1 - t));
		}
	},

	_createCone: function(regionData, positionOnCanvas, highestPoint, isAdditive) {
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
				var lateralDistance = (function(p1, p2) {
					var xDelta = p2.x - p1.x;
					var yDelta = p2.y - p1.y;
					return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
				})({x: x, y: y}, positionOnRegion);

				var height = Math.floor(positionOnRegion.z - Math.tan(angleOfRepose) * lateralDistance);

				if (regionData[y] !== undefined && height > 0) {
					if(isAdditive) {
						regionData[y][x] += height;
					} else if (height > regionData[y][x]) {
						regionData[y][x] = height;
					}
				}
			}
		}
	}
};