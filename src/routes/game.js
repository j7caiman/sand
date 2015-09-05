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
			function renderGame(uuid, email, rocks) {
				var responseObjects = {};
				responseObjects.uuid = uuid;

				if (email !== undefined && rocks !== undefined) {
					responseObjects.email = email;
					responseObjects.rocks = JSON.stringify(rocks);
				}

				if (environment === "development") {
					getDevelopmentSourceFiles(function (files) {
						responseObjects.scriptSources = files;
						res.render('game', responseObjects);
					});

				} else {
					responseObjects.scriptSources = ['/javascripts/min.js'];
					res.render('game', responseObjects);
				}
			}

			var newUuid = generateUuid();

			try {
				var playerData = JSON.parse(req.cookies.playerData);
				var uuid = playerData.uuid;
				var rememberMe = playerData.rememberMe;
				if (uuid === undefined) {
					debug('user had player data: ' + playerData + 'but no uuid and/or position');
					renderGame(newUuid);
					return;
				}
			} catch (e) {
				renderGame(newUuid);
				return;
			}

			if (!rememberMe) {
				renderGame(newUuid);
				return;
			}

			rockDAO.getRememberedUserWithData(uuid, newUuid, onQueriesComplete);

			function onQueriesComplete(userId, email, reservedArea, rocks) {
				if (email === undefined || rocks === undefined) {
					renderGame(newUuid);
				} else {
					caches.addLoggedInUser(userId, newUuid, reservedArea, rocks);
					renderGame(newUuid, email, rocks);
				}
			}
		}
	);
};

function generateUuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0;
		var v = (c == 'x') ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function getDevelopmentSourceFiles(onComplete) {
	var fileList = [];
	var numDirsToRead = 2;
	fs.readdir("./src/client", function (err, fileNames) {
		if (err) {
			throw err;
		}

		fileList = fileList.concat(fileNames);
		numDirsToRead--;
		if (numDirsToRead === 0) {
			onComplete(fileList);
		}
	});

	fs.readdir("./src/shared", function (err, fileNames) {
		if (err) {
			throw err;
		}

		fileList = fileList.concat(fileNames);
		numDirsToRead--;
		if (numDirsToRead === 0) {
			onComplete(fileList);
		}
	});
}