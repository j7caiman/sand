var express = require('express');
var router = express.Router();
var fs = require('fs');

router.post('/', function(req, res) {
	var data = JSON.stringify(req.body.regionData);
	var path = '../resources/world_datastore/world_256x256_'
		+ req.body.regionCoordinates.x + '_'
		+ req.body.regionCoordinates.y
		+ '.json';

	fs.writeFile(path, data, function (err) {
		if (err) {
			throw err;
		}
	});

	res.sendStatus(200);
});

module.exports = router;
