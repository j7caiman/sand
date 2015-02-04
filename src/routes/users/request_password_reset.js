var router = require('express').Router();
var debug = require('debug')('sand');
var urlEncodedParser = require('body-parser').urlencoded({extended: true});
var crypto = require('crypto');
var query = require('../../server/query_db');
var sendgrid = require('sendgrid')(process.env.SENDGRID_API_USER, process.env.SENDGRID_API_KEY);

module.exports = router.post('/',
	urlEncodedParser,
	function (req, res) {
		var email = req.body.email;
		if (email.length === 0) {
			res.send({error: 'please enter an email address.'});
			return;
		}

		query('select email from users where email = $1', [email], onQueryComplete);

		function onQueryComplete(error, result) {
			if (error) {
				res.status('500').send();
				return;
			}

			if (result.rows.length == 0) {
				res.send({error: 'email not found.'});
				return;
			}
			crypto.randomBytes(20, function (err, buf) {
				if (err) {
					debug('error generating token: ' + err);
					res.status('500').send();
					return;
				}

				var token = buf.toString('hex');
				onTokenCreated(token);
			});
		}

		function onTokenCreated(token) {
			var tokenExpiry = Date.now() + 86400000; // milliseconds in one day
			query('update users set (password_reset_token, password_reset_token_expiry) = ($2, $3) where email = $1',
				[email, token, tokenExpiry],
				function (err) {
					if (err) {
						debug('error saving to database: ' + err);
						res.status('500').send();
						return;
					}

					onTokenSaved(token);
				}
			);
		}

		function onTokenSaved(token) {
			var link = 'http://' + req.headers.host + '/reset_password/' + token;

			var payload = {
				to: email,
				from: 'sand@jonm.us',
				subject: 'sand: password reset request',
				text: 'use the following link to reset your password. ' +
				'the link will expire in 24 hours. thanks!\n\n' +
				link
			};

			sendgrid.send(payload, function (err) {
				if (err) {
					debug(err);
					res.status('500').send();
				} else {
					res.send({text: 'message sent to: ' + email + '. check your email to reset your password.'});
				}
			});
		}
	}
);