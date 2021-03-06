var router = require('express').Router();
var debug = require('debug')('sand');

var urlEncodedParser = require('body-parser').urlencoded({extended: true});
var cookieParser = require('cookie-parser')();

var query = require('../../server/query_db');
var bcrypt = require('bcrypt');

var rockDAO = require('../../server/rock_dao');

var caches = require('../../server/caches');

router.post('/',
	urlEncodedParser,
	cookieParser,
	function (req, res) {
		var email = req.body.email;
		var password = req.body.password;

		try {
			var uuid = JSON.parse(req.cookies.playerData).uuid;
		} catch (e) {
			res.send({error: 'please enable cookies in your browser.'});
			return;
		}

		if (email.length === 0) {
			res.send({error: 'please enter an email address.'});
			return;
		}

		if (password.length === 0) {
			res.send({error: 'please enter a password.'});
			return;
		}

		query('select id, email_validated, password_hash from users where email = $1', [email], onQueryComplete);

		function onQueryComplete(error, result) {
			if (error) {
				res.status('500').send();
				return;
			}

			if (result.rows.length == 0) {
				res.send({error: 'email not found.'});
				return;
			}

			if (!result.rows[0].email_validated) {
				res.send({error: 'please validate your email address ' +
				'by clicking the link sent to you in the email confirmation message.'});
				return;
			}

			bcrypt.compare(password, result.rows[0].password_hash, function (err, passwordsMatch) {
				if (err) {
					debug('bcrypt hash comparison failed:' + err);
					res.status('500').send();
					return;
				}

				if (passwordsMatch) {
					onPasswordConfirmed(result.rows[0].id);
				} else {
					res.send({error: 'incorrect password.'});
				}
			});
		}

		function onPasswordConfirmed(userId) {
			rockDAO.updateUuidAndFetchUserData(userId, uuid, onQueriesComplete);

			function onQueriesComplete(error, reservedArea, rocks) {
				if (error) {
					res.status('500').send();
					return;
				}

				caches.addLoggedInUser(userId, uuid, reservedArea, rocks);
				res.send({
					text: "log in successful",
					rocks: rocks
				});
			}
		}
	}
);

module.exports = router;
