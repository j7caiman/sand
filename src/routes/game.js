var express = require('express');
var debug = require('debug')('sand');
var router = express.Router();
var cookieParser = require('cookie-parser')();
var fs = require('fs');

var query = require('../server/query_db');
var rockDAO = require('../server/rock_dao');
var caches = require('../server/caches');

module.exports = function (environment) {
	return router.get('/',
		cookieParser,
		function (req, res) {
			function renderGame(email, rocks) {
				var responseObjects = {};
				if (email !== undefined && rocks !== undefined) {
					responseObjects.email = email;
					responseObjects.rocks = rocks;
				}

				if (environment === "development") {
					responseObjects.scriptSources = [];
					var numDirsToRead = 2;
					fs.readdir("./src/client", function (err, files) {
						if (err) {
							throw err;
						}

						responseObjects.scriptSources = responseObjects.scriptSources.concat(files);
						numDirsToRead--;
						if (numDirsToRead === 0) {
							res.render('game', responseObjects);
						}
					});

					fs.readdir("./src/shared", function (err, files) {
						if (err) {
							throw err;
						}

						responseObjects.scriptSources = responseObjects.scriptSources.concat(files);
						numDirsToRead--;
						if (numDirsToRead === 0) {
							res.render('game', responseObjects);
						}
					});
				} else {
					responseObjects.scriptSources = ['/javascripts/min.js'];
					res.render('game', responseObjects);
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

					caches.addLoggedInUser(uuid, id, result.rows);
					renderGame(email, JSON.stringify(result.rows));
				});
			});
		}
	);
};