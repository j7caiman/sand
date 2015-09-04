var router = require('express').Router();
var stream = require('stream');

var query = require('../server/query_db');
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

	function onRegionCreationComplete() {
		query('select region_data from regions where region_name = $1', [regionName], function (error, result) {
			if (error) {
				res.status("500").send(error);
				return;
			}

			res.setHeader("Content-Encoding", "gzip");
			res.setHeader("Content-Type", "application/json");

			var readStream = new stream.Readable();
			readStream.push(result.rows[0].region_data);
			readStream.push(null);

			readStream.pipe(res);
		});
	}
});

module.exports = router;
