var express = require('express');
var router = express.Router();
var fs = require('fs');

router.post('/', function(req, res) {
	var regionCoordinates = req.body;
	if(!Array.isArray(regionCoordinates)) {
		throw "Unsupported parameters: pass an array of region coordinates, e.g: [{ x: 0, y: 0 }, { x: 1, y: 0 }]"
	}

	var numRegionsToRead = regionCoordinates.length;
	for(var i = 0; i < numRegionsToRead; i++) {
		var path = '../resources/world_datastore/world_256x256_'
			+ regionCoordinates[i].x + '_'
			+ regionCoordinates[i].y + '.json';
		(function(index, path) {
			fs.readFile(path, 'utf8', function(err, regionData) {
				returnAllRegionsOnLoad(err, regionData, path, regionCoordinates[index]);
			});
		})(i, path);
	}

	var data = {
		regions: []
	};
	function returnAllRegionsOnLoad (err, regionData, path, coordinates) {
		if(err == null) {
			// do nothing
		} else if(err.code == 'ENOENT') {
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
			regionData = JSON.stringify(createGrid(256));

			fs.writeFile(path, regionData, function (err) {
				if (err) {
					throw err;
				}
			});
		} else {
			throw err;
		}

		data.regions.push({
			regionData: JSON.parse(regionData),
			coordinates: coordinates
		});

		if(data.regions.length == numRegionsToRead) {
			res.send(data);
		}
	}
});

module.exports = router;
