var express = require('express');
var router = express.Router();
var fs = require('fs');

router.post('/', function(req, res) {
	var data = JSON.stringify(req.body);
	fs.writeFile('../resources/world_datastore/world_256x256.json', data, function (err) {
		if (err) {
			console.log(err);
		}
	});
	res.sendStatus(200);

});

module.exports = router;
