var router = require('express').Router();
var debug = require('debug')('sand');
var jsonParser = require('body-parser').json({limit: '500kb'});

var fs = require('fs');
var zlib = require('zlib');
var stream = require('stream');

var regionFunctions = require('../server/region_functions');
var globalFunctions = require('../shared/global_functions');

router.post('/', jsonParser, function(req, res) {
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

	function onRegionCreationComplete(error) {
		if(error) {
			var message = "region lookup failed: " + error;
			debug(message);
			res.status("500").send(message);
			return;
		}

		regionNames.forEach(function (regionName) {
			var zipCode = globalFunctions.getRegionZipCode(regionName);

			var path = './resources/world_datastore/z' + zipCode + '/r' + regionName + '.json';
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

			// When footprints are being written to the region file, the file is first truncated.
			// So, occasionally, the read function will return an empty file. The proper way to solve this
			// issue would be to have a lock on the file when it is being written to, however, I couldn't figure
			// one out that didn't severely slow down the time taken to return a region.
			try {
				data.regions[regionName] = JSON.parse(regionData);
			} catch (error) {
				var zipCode = globalFunctions.getRegionZipCode(regionName);
				debug("error for region: z" + zipCode + "/r" + regionName);
				debug("regionData: " + regionData);
				res.status("500").send(message);
				return;
			}

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
