var router = require('express').Router();
var debug = require('debug')('sand');
var urlEncodedParser = require('body-parser').urlencoded({extended: true});

var query = require('../../server/query_db');

router.get('/:token',
	urlEncodedParser,
	function (req, res) {
		query('update users set(email_confirmation_token, email_validated) = (null, true) ' +
		'where email_confirmation_token = $1 returning id', [req.params.token], onQueryComplete);

		function onQueryComplete(err, result) {
			if (err || result.rows.length === 0) {
				res.status('500').send();
				return;
			}

			query('insert into rocks(owner_id) values ($1), ($1), ($1), ($1)', [result.rows[0].id], function(err) {
				if(err) {
					res.status('500').send();
					return;
				}

				onRocksCreated();
			});
		}

		function onRocksCreated() {
			res.render('account_confirmed', {
				sandUrl: 'http://' + req.headers.host
			});
		}
	}
);

module.exports = router;