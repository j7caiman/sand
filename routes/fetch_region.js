var express = require('express');
var router = express.Router();
var fs = require('fs');

router.post('/', function(req, res) {
	var regionNames = req.body;
	if(!Array.isArray(regionNames)) {
		throw "Unsupported parameters: pass an array of region names, e.g: [\"0_0\", \"0_-1\"]"
	}

	var numRegionsToRead = regionNames.length;
	for(var i = 0; i < numRegionsToRead; i++) {
		var path = '../resources/world_datastore/world_256x256_' + regionNames[i] + '.json';
		(function(index, path) {
			fs.readFile(path, 'utf8', function(err, regionData) {
				returnAllRegionsOnLoad(err, regionData, path, regionNames[index]);
			});
		})(i, path);
	}

	var data = {
		regions: {}
	};
	var numLoadedRegions = 0;
	function returnAllRegionsOnLoad (err, regionData, path, regionName) {
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

		data.regions[regionName] = JSON.parse(regionData);
		numLoadedRegions++;
		if(numLoadedRegions == numRegionsToRead) {
			res.send(data);
		}
	}
});

module.exports = router;
