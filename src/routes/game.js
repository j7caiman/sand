var express = require('express');
var debug = require('debug')('sand');
var router = express.Router();
var cookieParser = require('cookie-parser')();

var query = require('../server/query_db');
var rockDAO = require('../server/rock_dao');
var multiplayer = require('../server/multiplayer');

module.exports = function (environment) {
	return router.get('/',
		cookieParser,
		function (req, res) {
			function renderGame(email, rocks) {
				if (email !== undefined && rocks !== undefined) {
					res.render('game', {
						environment: environment,
						email: email,
						rocks: rocks
					});
				} else {
					res.render('game', {
						environment: environment
					});
				}
			}

			var playerData = req.cookies.playerData;
			if (playerData === undefined) {
				renderGame();
				return;
			}

			try {
				var uuid = JSON.parse(playerData).uuid;
				if (uuid === undefined) {
					debug('user had player data: ' + playerData + 'but no uuid and/or position');
					renderGame();
					return;
				}
			} catch (e) {
				renderGame();
				return;
			}

			query('select id, email from users where uuid = $1', [uuid], function (error, result) {
				if (error) {
					renderGame();
					return;
				}

				if (result.rows.length == 0) {
					renderGame();
					return;
				}

				var id = result.rows[0].id;
				var email = result.rows[0].email;
				rockDAO.fetchRocksForPlayer(id, function (error, result) {
					if (error) {
						renderGame();
						return;
					}

					multiplayer.addLoggedInUser(uuid, id, result.rows);
					renderGame(email, JSON.stringify(result.rows));
				});
			});
		}
	);
};