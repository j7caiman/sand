var router = require('express').Router();
var debug = require('debug')('sand');
var urlEncodedParser = require('body-parser').urlencoded({extended: true});
var query = require('../../server/query_db');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var sendgrid = require('sendgrid')(process.env.SENDGRID_API_USER, process.env.SENDGRID_API_KEY);

module.exports = router.post('/',
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

		bcrypt.hash(password, 10, function (err, passwordHash) {
			if (err) {
				debug('bcrypt hash function failed:' + err);
				res.status('500').send();
				return;
			}

			crypto.randomBytes(20, function (err, buf) {
				if (err) {
					debug('error generating token: ' + err);
					res.status('500').send();
					return;
				}

				var confirmationToken = buf.toString('hex');
				createUser(passwordHash, confirmationToken);
			});
		});

		function createUser(passwordHash, confirmationToken) {
			query('insert into users(email, password_hash, email_confirmation_token) values($1, $2, $3)',
				[email, passwordHash, confirmationToken],
				function (error) {
					if (error) {
						var kUniqueViolationCode = "23505";
						if (error.code === kUniqueViolationCode) {
							res.send({
								error: 'this email address has already been registered.' +
								' click \'reset password\' to request a password reset.'
							});
						} else {
							res.status('500').send();
						}

						return;
					}

					onUserCreated(confirmationToken);
				});
		}

		function onUserCreated(confirmationToken) {
			var link = 'http://' + req.headers.host + '/confirm_email/' + confirmationToken;

			var payload = {
				to: email,
				from: 'sand@jonm.us',
				subject: 'sand: account confirmation',
				text: 'thank you for registering! the eternal desert awaits. ' +
				'click the link to confirm your account.\n\n' +
				link
			};

			sendgrid.send(payload, function (err) {
				if (err) {
					debug(err);
					res.status('500').send();
				} else {
					res.send({text: 'email sent to: ' + email + '. check your email to confirm your account.'});
				}
			});
		}
	}
);
