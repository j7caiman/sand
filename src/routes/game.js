var express = require('express');
var router = express.Router();

module.exports = function(environment) {
	return router.get('/', function (req, res) {
		res.render('game', {
			environment: environment
		});
	});
};