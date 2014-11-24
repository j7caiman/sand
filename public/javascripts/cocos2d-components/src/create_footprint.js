sand.level.makeFootprint = function (blankRegionData, centerOfCanvas) {
	sand.level.imprintSphere(blankRegionData, centerOfCanvas, sand.constants.kFootprintRadius);
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