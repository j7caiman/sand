var debug = require('debug')('sand');
var processFootprint = require('./process_footprint');
var cookie = require('cookie');

var rockDAO = require('./rock_dao');

var connectedClients = {
	_data: {},

	getCurrentPlayers: function () {
		var currentPlayers = [];
		for (var socketId in this._data) {
			if (this._data.hasOwnProperty(socketId)) {
				var playerData = this._data[socketId];
				currentPlayers.push(playerData);
			}
		}
		return currentPlayers;
	},

	addPlayer: function (socketId, playerData) {
		this._data[socketId] = {
			uuid: playerData.uuid,
			position: playerData.lastPosition
		};
	},

	updatePlayerPosition: function (socketId, position) {
		this._data[socketId].position = position;
	},

	updateRock: function (socketId, rockData) {
		var player = this._data[socketId];
		if (player.rocks === undefined) {
			debug("user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.")
		} else {
			player.rocks[rockData.id] = {
				x: rockData.x,
				y: rockData.y
			};

			rockDAO.updateRockPosition(rockData.id, rockData.position, function () {});
		}
	},

	removePlayer: function (socketId) {
		delete this._data[socketId];
	},

	getPlayerById: function (socketId) {
		return this._data[socketId];
	},

	syncLoggedInUser: function (uuid, userId, rocks) {
		for (var socketId in this._data) {
			if (this._data.hasOwnProperty(socketId)) {
				if (this._data[socketId].uuid === uuid) {
					this._data[socketId].userId = userId;
					this._data[socketId].rocks = {};
					rocks.forEach(function (rock) {
						this._data[socketId].rocks[rock.id] = {
							x: rock.x,
							y: rock.y
						}
					}, this);
				}
			}
		}
	}
};

var rocksOnGround = {};
rockDAO.fetchAllRocks(function (error, rocks) {
	if (error) {
		throw error;
	}

	rocks.forEach(function (rock) {
		rocksOnGround[rock.id] = {
			x: rock.x,
			y: rock.y
		}
	});
});

exports.initMultiplayer = function (server) {
	var io = require('socket.io')(server);

	io.on('connection', function (socket) {
		socket.emit('onConnect', {
			otherPlayers: connectedClients.getCurrentPlayers(),
			rocks: rocksOnGround
		});

		try {
			var cookies = cookie.parse(socket.handshake.headers.cookie);
			var playerData = JSON.parse(cookies.playerData);
			connectedClients.addPlayer(socket.id, playerData);
			socket.broadcast.emit('playerMoved', {
				uuid: playerData.uuid,
				position: playerData.lastPosition
			});
		} catch (e) {
			debug('error while managing connected clients: ' + e);
		}

		socket.on('updatePosition', function (position) {
			connectedClients.updatePlayerPosition(socket.id, position);
			socket.broadcast.emit('playerMoved', {
				uuid: connectedClients.getPlayerById(socket.id).uuid,
				position: position
			});
		});

		socket.on('disconnect', function () {
			io.emit('playerDisconnected', connectedClients.getPlayerById(socket.id).uuid);
			connectedClients.removePlayer(socket.id);
		});

		socket.on('footprint', function (footprintData) {
			socket.broadcast.emit('footprint', footprintData);
			processFootprint(footprintData);
		});

		socket.on('rockPickedUp', function (rockData) {
			delete rocksOnGround[rockData.id];
			connectedClients.updateRock(socket.id, rockData);
			socket.broadcast.emit('rockPickedUp', rockData);
		});

		socket.on('rockPutDown', function (rockData) {
			rocksOnGround[rockData.id] = rockData.position;
			connectedClients.updateRock(socket.id, rockData);
			socket.broadcast.emit('rockPutDown', rockData);
		});
	});

	return io;
};

exports.syncLoggedInUser = function (uuid, id, rocks) {
	connectedClients.syncLoggedInUser(uuid, id, rocks);
};
