var router = require('express').Router();
var debug = require('debug')('sand');

var urlEncodedParser = require('body-parser').urlencoded({extended: true});

var postgres = require('pg');
var connectionString = 'postgres://jon:@localhost/sand'; //postgres://<user>:<password>@<host>/<database>
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

			postgres.connect(connectionString, function (err, client, onQueryComplete) {
				if (err) {
					onQueryComplete(client);
					debug('connection to database failed:' + err);
					res.status('500').send();
					return;
				}

				client.query(
					'insert into users(email, password_hash) values($1, $2)',
					[email, hash],
					function (err) {
						if (err) {
							onQueryComplete(err);
							debug('database insert failed:' + err);
							res.status('500').send();
							return;
						}

						onQueryComplete();
						res.send();
					}
				);
			});
		});
	}
);

module.exports = router;
