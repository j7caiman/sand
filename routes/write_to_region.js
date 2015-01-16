var express = require('express');
var router = express.Router();
var fs = require('fs');

var globalFunctions = require('../public/javascripts/shared/global_functions');

router.post('/', function(req, res) {
	var data = JSON.stringify(req.body.regionData);
	var path = '../resources/world_datastore/'
		+ globalFunctions.getRegionZipCode(req.body.regionName)
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
