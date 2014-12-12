var express = require('express');
var router = express.Router();
var fs = require('fs');
var zlib = require('zlib');
var stream = require('stream');

router.post('/', function(req, res) {
	var regionNames = req.body;
	if(!Array.isArray(regionNames)) {
		throw "Unsupported parameters: pass an array of region names, e.g: [\"0_0\", \"0_-1\"]"
	}

	regionNames.forEach(function(regionName, index) {
		var coordinates = regionName.split("_");
		if(coordinates.length != 2) {
			throw "Invalid region name: " + regionName;
		} else {
			function isInteger(value) {
				return !isNaN(value)
					&& parseInt(Number(value)) == value
					&& !isNaN(parseInt(value, 10));
			}
			if(!isInteger(coordinates[0]) || !isInteger(coordinates[1])) {
				throw "Invalid region name: " + regionName;
			}
		}

		var path = '../resources/world_datastore/world_256x256_' + regionName + '.json';
		(function(index, path) {
			fs.readFile(path, 'utf8', function(err, regionData) {
				returnAllRegionsOnLoad(err, regionData, path, regionNames[index]);
			});
		})(index, path);
	});

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
		if(numLoadedRegions == regionNames.length) {
			res.setHeader("Content-Encoding", "gzip");
			res.setHeader("Content-Type", "application/json");

			var stringStream = new stream.Readable();
			stringStream.push(JSON.stringify(data));
			stringStream.push(null);

			var gzip = zlib.createGzip();
			stringStream.pipe(gzip).pipe(res);
		}
	}
});

module.exports = router;
