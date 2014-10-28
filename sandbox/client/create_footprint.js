/**
 * Imprints a footprint into the grid at the specified location.
 * Modifies the grid.
 *
 * footprints are shaped like little squares (for now).
 * The sand is pushed out from underneath to form a roughly flat crater shape.
 *
 * example:
 *
 * 1 1 1 1 1
 * 1 1 1 1 1
 * 1 1 1 1 1
 * 1 1 1 1 1
 * 1 1 1 1 1
 *
 * becomes:
 *
 * 2 2 2 2 2
 * 2 0 0 0 2
 * 2 0 0 0 2
 * 2 0 0 0 2
 * 2 2 2 2 2
 *
 */
sandGlobals.imprints.square = function(position, grid) {
	// depressed 3x3 square
	grid[position.y][position.x]--;
	grid[position.y-1][position.x]--;
	grid[position.y+1][position.x]--;

	grid[position.y][position.x-1]--;
	grid[position.y-1][position.x-1]--;
	grid[position.y+1][position.x-1]--;

	grid[position.y][position.x+1]--;
	grid[position.y-1][position.x+1]--;
	grid[position.y+1][position.x+1]--;

	// borders are raised
	grid[position.y][position.x-2]++;
	grid[position.y-1][position.x-2]++;
	grid[position.y+1][position.x-2]++;
	grid[position.y+2][position.x-2]++;
	grid[position.y-2][position.x-2]++;

	grid[position.y][position.x+2]++;
	grid[position.y-1][position.x+2]++;
	grid[position.y+1][position.x+2]++;
	grid[position.y+2][position.x+2]++;
	grid[position.y-2][position.x+2]++;

	grid[position.y-2][position.x]++;
	grid[position.y-2][position.x-1]++;
	grid[position.y-2][position.x+1]++;

	grid[position.y+2][position.x]++;
	grid[position.y+2][position.x-1]++;
	grid[position.y+2][position.x+1]++;
};


sandGlobals.imprints.circle = function(position, radius, grid) {
	function calculateDistance(point1, point2) {
		var xDelta = point2.x - point1.x;
		var yDelta = point2.y - point1.y;

		return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
	}

	const levelWidth = grid[0].length;
	for (var y = 0; y < levelWidth; y++) {
		for (var x = 0; x < levelWidth; x++) {
			var currentLocation = { x: x, y: y}; //note: is not the center of the block
			var distanceFromCenter = calculateDistance(position, currentLocation);
			if(distanceFromCenter < radius) {
				grid[currentLocation.y][currentLocation.x]--;
			} else if(distanceFromCenter > radius + 0.5 && distanceFromCenter < radius + 2.0) {
				grid[currentLocation.y][currentLocation.x]++;
			}
		}
	}
};

// x^2 + y^2 = r^2
// x = square_root(r^2 - y^2)
sandGlobals.imprints.sphere = function(position, radius, grid) {
	function calculateDistance(point1, point2) {
		var xDelta = point2.x - point1.x;
		var yDelta = point2.y - point1.y;

		return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
	}

	const gridWidth = grid[0].length;
	for (var y = 0; y < gridWidth; y++) {
		for (var x = 0; x < gridWidth; x++) {
			var currentLocation = { x: x, y: y}; //note: is not the center of the block
			var distanceFromCenter = calculateDistance(position, currentLocation);
			if(distanceFromCenter < radius) {
				grid[currentLocation.y][currentLocation.x] -= Math.floor(Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter));
			}
		}
	}
};