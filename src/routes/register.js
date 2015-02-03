var router = require('express').Router();
var debug = require('debug')('sand');

var urlEncodedParser = require('body-parser').urlencoded({extended: true});

var query = require('../server/query_db');

var bcrypt = require('bcrypt');

router.post('/',
	urlEncodedParser,
	function (req, res) {
		var email = req.body.email;
		var password = req.body.password;
		var confirmPassword = req.body.confirmPassword;

		if (email.length === 0) {
			res.send({error: 'please enter an email address.'});
			return;
		}

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

			query('insert into users(email, password_hash) values($1, $2) returning id', [email, hash], onUserCreated);

			function onUserCreated(error, result) {
				if (error) {
					const unique_violation_code = "23505";
					if(error.code === unique_violation_code) {
						res.send({error: 'this email address has already been registered.' +
						' click \'reset password\' to request a password reset.'});
					} else {
						res.status('500').send();
					}
				} else {
					query(
						'insert into rocks(owner_id) values ($1), ($1), ($1), ($1)',
						[result.rows[0].id],
						onRocksCreated);
				}
			}

			function onRocksCreated(error, result) {
				if(error) {
					res.status('500').send();
				} else {
					res.send();
				}
			}
		});
	}
);

module.exports = router;
