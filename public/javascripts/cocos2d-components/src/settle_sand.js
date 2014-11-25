sand.level.settle = function(regionData) {
	const gridWidth = regionData[0].length;
	for (var y = 1; y < gridWidth - 1; y++) {
		for (var x = 1; x < gridWidth - 1; x++) {
			var currentLocation = { x: x, y: y}; //note: is not the center of the block
			var currentDepth        = regionData[currentLocation.y][currentLocation.x];
			var topAdjacentDepth    = regionData[currentLocation.y-1][currentLocation.x];
			var rightAdjacentDepth  = regionData[currentLocation.y][currentLocation.x+1];
			var bottomAdjacentDepth = regionData[currentLocation.y+1][currentLocation.x];
			var leftAdjacentDepth   = regionData[currentLocation.y][currentLocation.x-1];

			var depths = [
				{label:"current",depth:currentDepth},
				{label:"top",depth:topAdjacentDepth},
				{label:"right",depth:rightAdjacentDepth},
				{label:"bottom",depth:bottomAdjacentDepth},
				{label:"left",depth:leftAdjacentDepth}
			];
			depths.sort(function(first, second) {
				return first.depth - second.depth;
			});

			var lowestPoint = depths[0];

			if(currentDepth > lowestPoint.depth + 2) {
				regionData[currentLocation.y][currentLocation.x] --;
				switch(lowestPoint.label) {
					case "top": regionData[currentLocation.y-1][currentLocation.x] ++; break;
					case "right": regionData[currentLocation.y][currentLocation.x+1] ++; break;
					case "bottom": regionData[currentLocation.y+1][currentLocation.x] ++; break;
					case "left": regionData[currentLocation.y][currentLocation.x-1] ++; break;
				}
			}
		}
	}
};

function testSettleSand() {
	var level = [
		[1,2,1],
		[2,4,1],
		[1,0,1]
	];

	sand.level.settle(level);
}