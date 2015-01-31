var router = require('express').Router();
var debug = require('debug')('sand');

var urlEncodedParser = require('body-parser').urlencoded({extended: true});

var postgres = require('pg');
var connectionString = 'postgres://jon:@localhost/sand'; // postgres://<user>:<password>@<host>/<database>
var bcrypt = require('bcrypt');

router.post('/',
	urlEncodedParser,
	function (req, res) {
		var email = req.body.email;
		var password = req.body.password;

		if (email.length === 0) {
			res.send({error: 'please enter an email address.'});
			return;
		}

		if (password.length === 0) {
			res.send({error: 'please enter a password.'});
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
				'select email, password_hash from users where email=$1',
				[email],
				function (err, result) {
					if (err) {
						onQueryComplete(err);
						debug('database query failed:' + err);
						res.status('500').send();
						return;
					}

					onQueryComplete();

					if (result.rows.length > 1) {
						debug('unique constraint violated for user: ' + email);
						res.status('500').send();
						return;
					}

					if (result.rows.length == 0) {
						res.send({error: 'email not found.'});
						return;
					}

					bcrypt.compare(password, result.rows[0].password_hash, function (err, passwordsMatch) {
						if (err) {
							debug('bcrypt hash comparison failed:' + err);
							res.status('500').send();
							return;
						}

						if (passwordsMatch) {
							res.send();
						} else {
							res.send({error: 'incorrect password.'});
						}
					});
				}
			);
		});
	}
);

module.exports = router;
