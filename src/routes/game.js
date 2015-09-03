var express = require('express');
var debug = require('debug')('sand');
var router = express.Router();
var cookieParser = require('cookie-parser')();
var fs = require('fs');

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

			try {
				var playerData = JSON.parse(req.cookies.playerData);
				var uuid = playerData.uuid;
				var rememberMe = playerData.rememberMe;
				if (uuid === undefined) {
					debug('user had player data: ' + playerData + 'but no uuid and/or position');
					renderGame();
					return;
				}
			} catch (e) {
				renderGame();
				return;
			}

			if(!rememberMe) {
				renderGame();
				return;
			}

			rockDAO.getRememberedUserWithData(uuid, onQueriesComplete);

			function onQueriesComplete(userId, email, reservedArea, rocks) {
				if (email === undefined || rocks === undefined) {
					renderGame();
				} else {
					caches.addLoggedInUser(userId, uuid, reservedArea, rocks);
					renderGame(email, JSON.stringify(rocks));
				}
			}
		}
	);
};