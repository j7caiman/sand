sand.level.makeFootprint = function (blankRegionData, centerOfCanvas) {
	sand.level.imprintSphere(blankRegionData, centerOfCanvas, sand.constants.kFootprintRadius);
};

sand.level.computeAffectedBounds = function (imprintCall) {
	var blankRegionData = [];
	for (var y = 0; y < sand.constants.kRegionWidth; y++) {
		blankRegionData[y] = [];
		for (var x = 0; x < sand.constants.kRegionWidth; x++) {
			blankRegionData[y][x] = 0;
		}
	}

	var centerOfCanvas = {
		x: sand.constants.kCanvasWidth / 2,
		y: sand.constants.kCanvasWidth / 2
	};

	imprintCall(blankRegionData, centerOfCanvas);

	const centerOfRegion = sand.constants.kRegionWidth / 2;
	/**
	 * canvas element coordinate system
	 * (0,0)
	 *   +-------> (x,0)
	 *   |
	 *   |
	 *   |
	 *   v
	 *
	 *   (y,0)
	 */
	var bottom;
	var left = centerOfRegion;
	var top;
	var right = centerOfRegion;
	for (y = 0; y < sand.constants.kRegionWidth; y++) {
		for (x = 0; x < sand.constants.kRegionWidth; x++) {
			if (blankRegionData[y][x] != 0) {
				if (bottom === undefined) {
					bottom = y;
				}
				top = y;

				if (x < left) {
					left = x;
				}
				if (x > right) {
					right = x;
				}
			}
		}
	}

	return {
		center: {
			//x:
		},
		width: right - left,
		height: top - bottom
	};
};

// x^2 + y^2 = r^2
// x = square_root(r^2 - y^2)
sand.level.imprintSphere = function(regionData, positionOnCanvas, radius) {
	var sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
	var locationOnRegion = {
		"x": Math.floor(positionOnCanvas.x / sandGrainWidth),
		"y": Math.floor(positionOnCanvas.y / sandGrainWidth)
	};

	function calculateDistance(point1, point2) {
		var xDelta = point2.x - point1.x;
		var yDelta = point2.y - point1.y;

		return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
	}

	const regionWidth = sand.constants.kRegionWidth;
	for (var y = 0; y < regionWidth; y++) {
		for (var x = 0; x < regionWidth; x++) {
			var currentLocation = { x: x, y: y}; //note: is not the center of the block
			var distanceFromCenter = calculateDistance(locationOnRegion, currentLocation);
			if(distanceFromCenter < radius) {
				regionData[currentLocation.y][currentLocation.x] -= Math.floor(
					Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter)
				);
			}
		}
	}
};