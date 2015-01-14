var express = require('express');
var router = express.Router();
var fs = require('fs');

var regionFunctions = require('../sand_modules/region_functions');

router.post('/', function(req, res) {
	var data = JSON.stringify(req.body.regionData);
	var path = '../resources/world_datastore/'
		+ regionFunctions.getRegionZipCode(req.body.regionName)
		+ "/"
		+ req.body.regionName
		+ '.json';

	fs.writeFile(path, data, function (err) {
		if (err) {
			throw err;
		}
	});

	res.sendStatus(200);
});

module.exports = router;
