var router = require('express').Router();
var debug = require('debug')('sand');

var urlEncodedParser = require('body-parser').urlencoded({extended: true});
var cookieParser = require('cookie-parser')();

var query = require('../server/query_db');
var bcrypt = require('bcrypt');

var rockDAO = require('../server/rock_dao');

var multiplayer = require('../server/multiplayer');

router.post('/',
	urlEncodedParser,
	cookieParser,
	function (req, res) {
		var email = req.body.email;
		var password = req.body.password;

		try {
			var uuid = JSON.parse(req.cookies.playerData).uuid;
		} catch (e) {
			res.send({error: 'please enable cookies in your browser'});
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

		query('select id, password_hash from users where email = $1', [email], onQueryComplete);

		function onQueryComplete(error, result) {
			if (error) {
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
					onPasswordConfirmed(result.rows[0].id);
				} else {
					res.send({error: 'incorrect password.'});
				}
			});
		}

		function onPasswordConfirmed(id) {
			rockDAO.fetchRocksForPlayer(id, function (error, result) {
				if (error) {
					res.status('500').send();
					return;
				}

				multiplayer.syncLoggedInUser(uuid, id, result.rows);
				res.send(result.rows);
			});
		}
	}
);

module.exports = router;
