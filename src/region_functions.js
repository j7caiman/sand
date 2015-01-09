var fs = require('fs');

module.exports = {
	_zipCodeWidth: 4,
	_kCanvasWidth: 512,
	_kRegionWidth: 256,

	getRegionZipCode: function (regionName) {
		var coordinates = regionName.split("_");
		return Math.floor(coordinates[0] / this._zipCodeWidth)
			+ "_" + Math.floor(coordinates[1] / this._zipCodeWidth);
	},

	generateRegions: function(regionNames, onComplete) {
		var that = this;

		const zipCodeWidth = this._zipCodeWidth;
		var regionZipCodes = [];
		regionNames.forEach(function (regionName) {
			var regionZipCode = Math.floor(regionName.split("_")[0] / zipCodeWidth)
				+ "_" + Math.floor(regionName.split("_")[1] / zipCodeWidth);

			if(regionZipCodes.indexOf(regionZipCode) === -1) {
				regionZipCodes.push(regionZipCode);
			}
		});

		var zipCodesToAccountFor = regionZipCodes.length;
		regionZipCodes.forEach(function (zipCode) {
			var path = '../resources/world_datastore/' + zipCode;
			fs.readdir(path, function (err) {
				function zipCodeCompleted() {
					zipCodesToAccountFor--;
					if (zipCodesToAccountFor === 0) {
						onComplete();
					}
				}

				if (err == null) {
					zipCodeCompleted();
				} else if (err.code == 'ENOENT') {
					that._createRegionsForZipCode(zipCode, function () {
						zipCodeCompleted();
					});
				} else {
					throw err;
				}
			});
		});
	},

	_createRegionsForZipCode: function(zipCode, onComplete) {
		var that = this;

		const zipCodeWidth = this._zipCodeWidth;
		const numRegionsToCreate = zipCodeWidth * zipCodeWidth;
		var numRegionsCreated = 0;
		fs.mkdir('../resources/world_datastore/' + zipCode, function (err) {
			if (err) {
				throw err;
			}

			var regionsToCreate = that._listRegionsInZipCode(zipCode);
			regionsToCreate.forEach(function(region) {
				region.data = that._createGrid(256);
			});

			that._generateLargeDune(regionsToCreate);

			regionsToCreate.forEach(function (region) {
				var path = '../resources/world_datastore/' + zipCode + '/' + region.name + '.json';
				fs.writeFile(path, JSON.stringify(region.data), function (err) {
					if (err) {
						throw err;
					}

					numRegionsCreated++;
					if (numRegionsCreated === numRegionsToCreate) {
						onComplete();
					}
				});
			});
		});
	},

	_listRegionsInZipCode: function(zipCode) {
		const zipCodeWidth = this._zipCodeWidth;

		var regionsToCreate = [];
		for (var x = 0; x < zipCodeWidth; x++) {
			for (var y = 0; y < zipCodeWidth; y++) {
				var coordinates = {};
				coordinates.x = (zipCode.split("_")[0] * zipCodeWidth) + x;
				coordinates.y = (zipCode.split("_")[1] * zipCodeWidth) + y;
				regionsToCreate.push({
					name: coordinates.x + "_" + coordinates.y,
					x: coordinates.x,
					y: coordinates.y
				});
			}
		}
		return regionsToCreate;
	},

	_createGrid: function (width) {
		var grid = [];
		for (var y = 0; y < width; y++) {
			grid.push([]);
			for (var x = 0; x < width; x++) {
				grid[y].push(0);
			}
		}
		return grid;
	},

	_generateLargeDune: function(regions) {
		const zipCodeWidth = this._zipCodeWidth;

		var bottomRightRegion = regions[zipCodeWidth - 1];
		var topLeftRegion = regions[(zipCodeWidth * zipCodeWidth) - zipCodeWidth];

		var begin = this._toGlobalCoordinates(
			{
				x: this._kCanvasWidth / 2,
				y: this._kCanvasWidth / 2
			},
			bottomRightRegion
		);

		var end = this._toGlobalCoordinates(
			{
				x: this._kCanvasWidth / 2,
				y: this._kCanvasWidth / 2
			},
			topLeftRegion
		);

		var bezier = this._generateWindingCurve(begin, end, 1);

		regions.forEach(function(region) {
			this._inscribeDuneToRegion(bezier, region);
		}, this);
	},

	_generateWindingCurve: function (begin, end) {
		var angle = Math.atan2(end.y - begin.y, end.x - begin.x);
		var duneCurveMultiplier = 2000;

		var cp1Offset = this._getRandomCoordinateWithinUnitCircleSector(angle - Math.PI/2, angle + Math.PI/2);
		var cp1 = {
			x: cp1Offset.x * duneCurveMultiplier + begin.x,
			y: cp1Offset.y * duneCurveMultiplier + begin.y
		};

		var cp2Offset = this._getRandomCoordinateWithinUnitCircleSector(angle + Math.PI/2, angle + 3 * Math.PI/2);
		var cp2 = {
			x: cp2Offset.x * duneCurveMultiplier + end.x,
			y: cp2Offset.y * duneCurveMultiplier + end.y
		};

		return this._createBezierFunction(begin, cp1, cp2, end);
	},

	_getRandomCoordinateWithinUnitCircleSector: function (minAngle, maxAngle) {
		var angle = this._getRandomFloat(minAngle, maxAngle);
		var u = Math.random() + Math.random(); //ensures uniform distribution within circle (http://stackoverflow.com/a/5838055)
		var offset = (u > 1) ? (2 - u) : u;
		return {
			x: offset * Math.cos(angle),
			y: offset * Math.sin(angle)
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
			var positionOfCone = this._toLocalCoordinates(dunePath(t), region);
			var height = this._determineHeightOfCone(t);
			this._createCone(region.data, positionOfCone, height);
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

	_createCone: function(regionData, positionOnCanvas, highestPoint) {
		const angleOfRepose = Math.PI / 4;
		const sandGrainWidth = this._kCanvasWidth / this._kRegionWidth; // blocks are square
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
				this._kRegionWidth, Math.ceil(positionOnRegion.x + radiusOfCone)
			),
			bottom: Math.max(
				0, Math.floor(positionOnRegion.y - radiusOfCone)
			),
			top: Math.min(
				this._kRegionWidth, Math.ceil(positionOnRegion.y + radiusOfCone)
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
				if(regionData[y] !== undefined && height > 0 && height > regionData[y][x]) {
					regionData[y][x] = height;
				}
			}
		}
	},

	_toGlobalCoordinates: function(point, region) {
		return {
			x: point.x + (region.x * this._kCanvasWidth),
			y: point.y + (region.y * this._kCanvasWidth)
		}
	},

	_toLocalCoordinates: function(point, region) {
		return {
			x: point.x - (region.x * this._kCanvasWidth),
			y: point.y - (region.y * this._kCanvasWidth)
		}
	}
};