var router = require('express').Router();
var debug = require('debug')('sand');
var urlEncodedParser = require('body-parser').urlencoded({extended: true});

var query = require('../../server/query_db');

var bcrypt = require('bcrypt');

router.post('/:token',
	urlEncodedParser,
	function (req, res) {
		var password = req.body.password;
		var confirmPassword = req.body.confirmPassword;

		if (password.length === 0) {
			res.send({error: 'please enter a password.'});
			return;
		}

		if (confirmPassword.length === 0) {
			res.send({error: 'please retype your password to confirm it.'});
			return;
		}

		if (password !== confirmPassword) {
			res.send({error: 'passwords must match each other.'});
			return;
		}

		if (password.length < 8) {
			res.send({error: 'password must be at least 8 characters.'});
			return;
		}

		bcrypt.hash(password, 10, function (err, hash) {
			if (err) {
				debug('bcrypt hash function failed:' + err);
				res.status('500').send();
				return;
			}

			query('update users set ' +
				'(password_hash, ' +
				'password_reset_token, ' +
				'password_reset_token_expiry, ' +
				'email_validated, ' +
				'email_confirmation_token) ' +
				'= ($1, null, null, true, null) where password_reset_token = $2',
				[hash, req.params.token],
				onQueryComplete);
		});

		function onQueryComplete(err) {
			if(err) {
				res.status('500').send();
			} else {
				res.send({
					text: 'password change successful. Returning to desert...',
					url: 'http://' + req.headers.host
				});
			}
		}
	}
);

module.exports = router;
