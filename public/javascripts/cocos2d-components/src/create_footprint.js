// x^2 + y^2 = r^2
// x = square_root(r^2 - y^2)
sand.level.imprintSphere = function(regionData, positionOnRegion, radius) {
	var blockWidth = sand.constants.kCanvasWidth / regionData[0].length; // blocks are square
	var locationOnGrid = {
		"x": Math.floor(positionOnRegion.x / blockWidth),
		"y": Math.floor(positionOnRegion.y / blockWidth)
	};

	function calculateDistance(point1, point2) {
		var xDelta = point2.x - point1.x;
		var yDelta = point2.y - point1.y;

		return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
	}

	const gridWidth = regionData[0].length;
	for (var y = 0; y < gridWidth; y++) {
		for (var x = 0; x < gridWidth; x++) {
			var currentLocation = { x: x, y: y}; //note: is not the center of the block
			var distanceFromCenter = calculateDistance(locationOnGrid, currentLocation);
			if(distanceFromCenter < radius) {
				regionData[currentLocation.y][currentLocation.x] -= Math.floor(
					Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter)
				);
			}
		}
	}
};