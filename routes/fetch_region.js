var express = require('express');
var router = express.Router();
var fs = require('fs');

router.get('/', function(req, res) {
	fs.readFile('../resources/world_datastore/world_256x256.json', 'utf8', function (err, data) {
		if (err) {
			console.log(err);
		} else {
			res.send(data);
		}
	});
});

module.exports = router;
