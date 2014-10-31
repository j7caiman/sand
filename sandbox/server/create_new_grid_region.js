var fs = require('fs');
var path = require('path');

if(process.argv.length < 4) {
	console.log("To create a new world file, specify the width and the full path as the first two parameters.");
} else {
	createWorldFile(process.argv[2], process.argv[3]);
}

function createWorldFile(width, outputPath) {
	fs.open(outputPath, 'w', function (err) {
		if (err) {
			console.log(err);
		} else {
			var data = JSON.stringify(createGrid(width));
			fs.writeFile(outputPath, data, function (err) {
				if (err) {
					console.log(err);
				} else {
					console.log("level written to " + outputPath + " with width: " + width);
				}
			});
		}
	});
}

function createGrid(width) {
	var grid = [];
	for(var y = 0; y < width; y++) {
		grid.push([]);
		for(var x = 0; x < width; x++) {
			grid[y].push(0);
		}
	}

	return grid;
}