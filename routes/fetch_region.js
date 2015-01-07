var express = require('express');
var router = express.Router();
var fs = require('fs');
var zlib = require('zlib');
var stream = require('stream');

var regionFunctions = require('../src/region_functions');

router.post('/', function(req, res) {
	var regionNames = req.body;

	(function validateInput() {
		if(!Array.isArray(regionNames)) {
			throw "Unsupported parameters: pass an array of region names, e.g: [\"0_0\", \"0_-1\"]"
		}

		regionNames.forEach(function (regionName) {
			var coordinates = regionName.split("_");
			if (coordinates.length != 2) {
				throw "Invalid region name: " + regionName;
			} else {
				function isInteger(value) {
					return !isNaN(value)
						&& parseInt(Number(value)) == value
						&& !isNaN(parseInt(value, 10));
				}

				if (!isInteger(coordinates[0]) || !isInteger(coordinates[1])) {
					throw "Invalid region name: " + regionName;
				}
			}
		});
	})();

	regionFunctions.generateRegions(regionNames, onRegionCreationComplete);

	function onRegionCreationComplete() {
		regionNames.forEach(function (regionName) {
			var zipCode = regionFunctions.getRegionZipCode(regionName);

			var path = '../resources/world_datastore/' + zipCode + '/' + regionName + '.json';
			fs.readFile(path, 'utf8', function (err, regionData) {
				returnAllRegionsOnLoad(err, regionData, regionName);
			});
		});

		var data = {
			regions: {}
		};
		var numLoadedRegions = 0;

		function returnAllRegionsOnLoad(err, regionData, regionName) {
			if (err != null) {
				throw err;
			}

			data.regions[regionName] = JSON.parse(regionData);
			numLoadedRegions++;
			if (numLoadedRegions == regionNames.length) {
				res.setHeader("Content-Encoding", "gzip");
				res.setHeader("Content-Type", "application/json");

				var stringStream = new stream.Readable();
				stringStream.push(JSON.stringify(data));
				stringStream.push(null);

				var gzip = zlib.createGzip();
				stringStream.pipe(gzip).pipe(res);
			}
		}
	}
});

module.exports = router;
