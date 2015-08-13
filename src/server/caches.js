var debug = require('debug')('sand');
var rockDAO = require('./rock_dao');
var rockFunctions = require('./../shared/shared_rock_functions');

module.exports = {
	_rocksOnGround: {},	// key: rockId, values: {x, y}
	_reservedAreas: {},	// key: uuid, value: [area coordinates]

	// contains users who have confirmed their emails
	// key: uuid, values: {userId, rocks}
	// rocks: key: rockId, values: {x, y}
	_users: {},

	_uuidToDataMap: {},	// key: uuid, values: {position}

	initialize: function (onComplete) {
		var that = this;

		var queriesToComplete = 2;
		rockDAO.fetchAllRocks(function (error, rocks) {
			if (error) {
				throw error;
			}

			rockDAO.fetchUuidsForUsersWithRocks(function (error, users) {
				if (error) {
					throw error;
				}

				var userIdToUuidMap = {};
				users.rows.forEach(function (user) {
					that._users[user.uuid] = {
						userId: user.id,
						rocks: {}
					};

					userIdToUuidMap[user.id] = user.uuid;
				});

				rocks.rows.forEach(function (rock) {
					if (rock.x && rock.y) {
						that._rocksOnGround[rock.id] = {
							x: rock.x,
							y: rock.y
						};
					}

					var uuid = userIdToUuidMap[rock.owner_id];
					that._users[uuid].rocks[rock.id] = {
						x: rock.x ? rock.x : null,
						y: rock.y ? rock.y : null
					};
				});

				queriesToComplete--;
				if (queriesToComplete === 0) {
					onComplete();
				}
			});
		});

		rockDAO.fetchReservedAreas(function (error, result) {
			if (error) {
				throw error;
			}

			result.rows.forEach(function (row) {
				that._reservedAreas[row.uuid] = row.reserved_area_path.map(function (point) {
					return {
						x: point[0],
						y: point[1]
					}
				});
			});

			queriesToComplete--;
			if (queriesToComplete === 0) {
				onComplete();
			}
		});
	},

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
		var that = this;
		for (var uuid in that._uuidToDataMap) {
			if (that._uuidToDataMap.hasOwnProperty(uuid)) {
				currentPlayers.push({
					uuid: uuid,
					position: that._uuidToDataMap[uuid].position
				});
			}
		}
		return currentPlayers;
	},

	getRocksOnGround: function () {
		return this._rocksOnGround;
	},

	getActivatedRockIds: function () {
		var rockIds = [];

		var that = this;
		for (var uuid in that._reservedAreas) {
			if (that._reservedAreas.hasOwnProperty(uuid)) {
				for (var rockId in that._users[uuid].rocks) {
					if (that._users[uuid].rocks.hasOwnProperty(rockId)) {
						rockIds.push(rockId);
					}
				}
			}
		}

		return rockIds;
	},

	getReservedAreas: function () {
		return this._reservedAreas;
	},

	rockPickedUpUpdate: function (data, onComplete) {
		var uuid = data.uuid;
		var rockId = data.rockId;

		var player = this._users[uuid];
		if (player === undefined) {
			debug("rockPickedUp: user not found, uuid: " + uuid);
		} else {
			var that = this;
			rockDAO.updateRockPosition(rockId, function (error) {
				if (!error) {
					delete that._rocksOnGround[rockId];

					player.rocks[rockId].x = null;
					player.rocks[rockId].y = null;

					if (that._reservedAreas[uuid] !== undefined) {
						that._removeReservedArea(player, uuid, onComplete);
					} else {
						onComplete();
					}
				}
			});
		}
	},

	_removeReservedArea: function (player, uuid, onComplete) {
		var that = this;
		rockDAO.deleteReservedArea(player.userId, function () {
			delete that._reservedAreas[uuid];

			var rockIds = [];
			for (var rockId in player.rocks) {
				if (player.rocks.hasOwnProperty(rockId)) {
					rockIds.push(rockId);
				}
			}

			onComplete(uuid, rockIds);
		});
	},

	rockPutDownUpdate: function (data, onComplete) {
		var uuid = data.uuid;
		var rockId = data.rockId;
		var position = data.position;

		var player = this._users[uuid];
		if (player === undefined) {
			debug("rockPutDown: user not found, uuid: " + uuid);
		} else {
			var that = this;
			rockDAO.updateRockPosition(rockId, position, function (error) {
				if (!error) {
					that._rocksOnGround[rockId] = position;

					/**
					 * Need to clone position since player.rocks will have additional fields added, whereas 'position'
					 * is a part of 'data', which is going to be emitted by socket.io.
					 * If socket.io attempts to emit an object that contains a circular reference, the server runs out
					 * of memory and crashes.
					 */
					player.rocks[rockId].x = position.x;
					player.rocks[rockId].y = position.y;

					onComplete();
				}
			});
		}
	},

	addLoggedInUser: function (uuid, userId, rocks) {
		this._users[uuid] = {
			userId: userId,
			rocks: {}
		};

		rocks.forEach(function (rock) {
			this._users[uuid].rocks[rock.id] = {
				x: rock.x ? rock.x : null,
				y: rock.y ? rock.y : null
			};
		}, this)
	},

	addReservedArea: function (uuid, onComplete) {
		var player = this._users[uuid];
		if (player === undefined) {
			debug("addReservedArea: user not found, uuid: " + uuid);
			return;
		}

		var rocks = player.rocks;
		var rockId;
		var points = [];
		for (rockId in rocks) {
			if (rocks.hasOwnProperty(rockId)) {
				var rock = rocks[rockId];
				if (rock.x === null || rock.y === null) {
					return;
				}

				points.push(rock);
			}
		}

		var path = rockFunctions.getReservedPerimeterIfValid(points);
		if (!path) {
			return;
		}

		var rockIds = [];
		for (rockId in rocks) {
			if (rocks.hasOwnProperty(rockId)) {
				rockIds.push(rockId);
			}
		}

		var that = this;
		rockDAO.writeReservedArea(player.userId, path, function () {
			that._reservedAreas[uuid] = path;

			onComplete(path, rockIds);
		});
	}
};