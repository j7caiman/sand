var express = require('express');
var router = express.Router();
var environment = express().get('env');

router.get('/', function(req, res) {
	res.render('game', {
		environment: environment
	});
});

module.exports = router;
