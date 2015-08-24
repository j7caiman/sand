var router = require('express').Router();
var debug = require('debug')('sand');

var fs = require('fs');

var regionFunctions = require('../server/region_functions');
var globalFunctions = require('../shared/global_functions');

router.get('/', function (req, res) {
	var regionName = req.query.regionName;

	(function validateInput() {
		var coordinates = regionName.split("_");
		if (coordinates.length != 2
			|| !globalFunctions.isInteger(coordinates[0])
			|| !globalFunctions.isInteger(coordinates[1])) {
			throw "Invalid region name: " + regionName;
		}
	})();

	regionFunctions.generateMissingRegions(regionName, onRegionCreationComplete);

	function onRegionCreationComplete(error) {
		if (error) {
			var message = "region lookup failed: " + error;
			debug(message);
			res.status("500").send(message);
			return;
		}

		var zipCode = globalFunctions.getRegionZipCode(regionName);
		var path = './resources/world_datastore/z' + zipCode + '/r' + regionName + '.json.gz';
		var fileStream = fs.createReadStream(path);

		res.setHeader("Content-Encoding", "gzip");
		res.setHeader("Content-Type", "application/json");
		fileStream.pipe(res);
	}
});

module.exports = router;
