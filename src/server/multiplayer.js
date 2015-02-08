var debug = require('debug')('sand');
var processFootprint = require('./process_footprint');
var rockDAO = require('./rock_dao');

var connectedClients = {
	_uuidToDataMap: {},

	addOrUpdatePlayer: function (uuid, position) {
		if (this._uuidToDataMap[uuid] === undefined) {
			this._uuidToDataMap[uuid] = {};
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
	}
};

var caches = {
	_rocksOnGround: {},
	_users: {},

	initialize: function() {
		var that = this;
		rockDAO.fetchRocksOnGround(function (error, rocks) {
			if (error) {
				throw error;
			}

			rocks.forEach(function (rock) {
				that._rocksOnGround[rock.id] = {
					x: rock.x,
					y: rock.y
				}
			});
		});
	},

	getRocksOnGround: function() {
		return this._rocksOnGround;
	},

	rockPickedUpUpdate: function (data, onComplete) {
		var uuid = data.uuid;
		var rockId = data.id;

		var player = this._users[uuid];
		if (player.rocks === undefined) {
			debug("rockPickedUp: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
		} else {
			var that = this;
			rockDAO.updateRockPosition(rockId, function (error) {
				if (!error) {
					delete that._rocksOnGround[rockId];
					player.rocks[rockId] = null;

					onComplete();
				}
			});
		}
	},

	rockPutDownUpdate: function (data, onComplete) {
		var uuid = data.uuid;
		var rockId = data.id;
		var position = data.position;

		var player = this._users[uuid];
		if (player.rocks === undefined) {
			debug("rockPutDown: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
		} else {
			var that = this;
			rockDAO.updateRockPosition(rockId, position, function (error) {
				if (!error) {
					that._rocksOnGround[rockId] = position;
					player.rocks[rockId] = position;

					onComplete();
				}
			});
		}
	},

	addLoggedInUser: function(uuid, userId, rocks) {
		this._users[uuid] = {
			userId: userId,
			rocks: rocks
		};

		rocks.forEach(function (rock) {
			if(rock.x && rock.y) {
				this._rocksOnGround[rock.id] = {
					x: rock.x,
					y: rock.y
				}
			}
		}, this)
	}
};

exports.addLoggedInUser = function(uuid, userId, rocks) {
	caches.addLoggedInUser(uuid, userId, rocks);
};

exports.initMultiplayer = function (server) {
	caches.initialize();

	var io = require('socket.io')(server);

	io.use(function (socket, next) {
		var uuid = socket.handshake.query.uuid;
		var position = {
			x: socket.handshake.query.x,
			y: socket.handshake.query.y
		};

		connectedClients.addOrUpdatePlayer(uuid, position);
		socket.broadcast.emit('playerMoved', {
			uuid: uuid,
			position: position
		});
		next();
	});

	io.on('connection', function (socket) {
		socket.emit('onConnect', {
			players: connectedClients.getCurrentPlayers(),
			rocks: caches.getRocksOnGround()
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
			caches.rockPickedUpUpdate(data, function () {
				socket.broadcast.emit('rockPickedUp', data);
			});
		});

		socket.on('rockPutDown', function (data) {
			caches.rockPutDownUpdate(data, function () {
				socket.broadcast.emit('rockPutDown', data);
			});
		});
	});

	return io;
};