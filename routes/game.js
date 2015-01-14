var express = require('express');
var router = express.Router();

router.get('/', function(req, res) {
	res.render('game', { title: 'Sand' });
});

module.exports = router;
