var router = require('express').Router();
var debug = require('debug')('sand');
var urlEncodedParser = require('body-parser').urlencoded({extended: true});

var query = require('../../server/query_db');

router.get('/:token',
	urlEncodedParser,
	function (req, res) {
		query('select password_reset_token_expiry from users where password_reset_token = $1', [req.params.token], onQueryComplete);

		function onQueryComplete(err, result) {
			if(err) {
				res.status('500').send();
			} else {
				var tokenExists = result.rows.length !== 0
					&& Date.now() < result.rows[0].password_reset_token_expiry;

				res.render('set_new_password', {
					token: req.params.token,
					tokenExists: tokenExists
				});
			}
		}
	}
);

module.exports = router;
