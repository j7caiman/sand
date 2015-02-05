var debug = require('debug')('sand');
var processFootprint = require('./process_footprint');
var cookie = require('cookie');

var rockDAO = require('./rock_dao');

var connectedClients = {
	_uuidToDataMap: {},

	getPlayerByUuid: function (uuid) {
		return this._uuidToDataMap[uuid];
	},

	addOrUpdatePlayer: function (uuid, position, socketId) {
		if (this._uuidToDataMap[uuid] === undefined) {
			this._uuidToDataMap[uuid] = {};
		} else if (this._uuidToDataMap[uuid].socketId !== socketId) {
			debug('player: ' + uuid + 'changed socketId from: ' + this._uuidToDataMap[uuid].socketId + ' to ' + socketId);
			this._uuidToDataMap[uuid].socketId = socketId;
		}

		this._uuidToDataMap[uuid].position = position;
	},

	removePlayer: function (uuid) {
		if (this._uuidToDataMap[uuid] === undefined) {
			debug('disconnect event received from player: ' + uuid + 'but player was not present');
		} else {
			delete this._uuidToDataMap[uuid];
		}
	},

	getCurrentPlayers: function () {
		var currentPlayers = [];
		for (var uuid in this._uuidToDataMap) {
			if (this._uuidToDataMap.hasOwnProperty(uuid)) {
				currentPlayers.push({
					uuid: uuid,
					position: this._uuidToDataMap[uuid].position
				});
			}
		}
		return currentPlayers;
	},

	syncLoggedInUser: function (uuid, userId, rocks) {
		if (this._uuidToDataMap[uuid] === undefined) {
			debug('player: ' + uuid + ', userId: ' + userId + ' logged in, but was not in connected users cache.');
			this._uuidToDataMap[uuid] = {};
		}

		this._uuidToDataMap[uuid].userId = userId;
		this._uuidToDataMap[uuid].rocks = {};
		rocks.forEach(function (rock) {
			this._uuidToDataMap[uuid].rocks[rock.id] = {
				x: rock.x,
				y: rock.y
			}
		}, this);
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

function rockPickedUpUpdate(data, onComplete) {
	var uuid = data.uuid;
	var rockId = data.id;

	var player = connectedClients.getPlayerByUuid(uuid);
	if (player.rocks === undefined) {
		debug("rockPickedUp: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
	} else {
		rockDAO.updateRockPosition(rockId, function (error) {
			if (!error) {
				delete rocksOnGround[rockId];
				player.rocks[rockId] = null;

				onComplete();
			}
		});
	}
}

function rockPutDownUpdate(data, onComplete) {
	var uuid = data.uuid;
	var rockId = data.id;
	var position = data.position;

	var player = connectedClients.getPlayerByUuid(uuid);
	if (player.rocks === undefined) {
		debug("rockPutDown: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
	} else {
		rockDAO.updateRockPosition(rockId, position, function (error) {
			if (!error) {
				rocksOnGround[rockId] = position;
				player.rocks[rockId] = position;

				onComplete();
			}
		});
	}
}

exports.initMultiplayer = function (server) {
	var io = require('socket.io')(server);

	io.use(function (socket, next) {
		connectedClients.addOrUpdatePlayer(
			socket.handshake.query.uuid,
			{
				x: socket.handshake.query.x,
				y: socket.handshake.query.y
			});
		next();
	});

	io.on('connection', function (socket) {
		socket.emit('onConnect', {
			players: connectedClients.getCurrentPlayers(),
			rocks: rocksOnGround
		});

		socket.on('updatePosition', function (data) {
			connectedClients.addOrUpdatePlayer(data.uuid, data.position);
			socket.broadcast.emit('playerMoved', data);
		});

		socket.on('disconnect', function () {
			connectedClients.removePlayer(socket.handshake.query.uuid);
			io.emit('playerDisconnected', socket.handshake.query.uuid);
		});

		socket.on('footprint', function (footprintData) {
			socket.broadcast.emit('footprint', footprintData);
			processFootprint(footprintData);
		});

		socket.on('rockPickedUp', function (data) {
			rockPickedUpUpdate(data, function () {
				socket.broadcast.emit('rockPickedUp', data);
			});
		});

		socket.on('rockPutDown', function (data) {
			rockPutDownUpdate(data, function () {
				socket.broadcast.emit('rockPutDown', data);
			});
		});
	});

	return io;
};

exports.syncLoggedInUser = function (uuid, id, rocks) {
	connectedClients.syncLoggedInUser(uuid, id, rocks);
};
