var debug = require('debug')('sand');
var rockDAO = require('./rock_dao');
var rockFunctions = require('./../shared/shared_rock_functions');

module.exports = {
	_rocksOnGround: {},
	_reservedAreas: {},
	_users: {},

	initialize: function (onComplete) {
		var that = this;

		var queriesToComplete = 2;
		rockDAO.fetchRocksOnGround(function (error, rocks) {
			if (error) {
				throw error;
			}

			rocks.forEach(function (rock) {
				that._rocksOnGround[rock.id] = {
					x: rock.x,
					y: rock.y
				};

				if (rock.reserved_area_id !== null) {
					that._rocksOnGround[rock.id].areaId = rock.reserved_area_id;
				}
			});

			queriesToComplete--;
			if (queriesToComplete === 0) {
				onComplete();
			}
		});

		rockDAO.fetchReservedAreas(function (error, result) {
			if (error) {
				throw error;
			}

			result.rows.forEach(function (row) {
				that._reservedAreas[row.owner_uuid] = row.path.map(function (point) {
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

	getRocksOnGround: function () {
		return this._rocksOnGround;
	},

	getReservedAreas: function () {
		return this._reservedAreas;
	},

	rockPickedUpUpdate: function (data, onComplete) {
		var uuid = data.uuid;
		var rockId = data.id;

		var player = this._users[uuid];
		if (player === undefined) {
			debug("rockPickedUp: user not found, uuid: " + uuid);
		} else if (player.rocks === undefined) {
			debug("rockPickedUp: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
		} else {
			var that = this;
			rockDAO.updateRockPosition(rockId, function (error) {
				if (!error) {
					delete that._rocksOnGround[rockId];

					player.rocks[rockId].x = null;
					player.rocks[rockId].y = null;

					if (player.rocks[rockId].areaId !== undefined) {
						that.removeReservedArea(player.rocks, onComplete);
					} else {
						onComplete();
					}
				}
			});
		}
	},

	rockPutDownUpdate: function (data, onComplete) {
		var uuid = data.uuid;
		var rockId = data.id;
		var position = data.position;

		var player = this._users[uuid];
		if (player === undefined) {
			debug("rockPutDown: user not found, uuid: " + uuid);
		} else if (player.rocks === undefined) {
			debug("rockPutDown: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
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
			userId: userId
		};

		this._users[uuid].rocks = {};
		rocks.forEach(function (rock) {
			if (rock.x && rock.y) {
				this._users[uuid].rocks[rock.id] = {
					x: rock.x,
					y: rock.y
				};
				if (rock.reserved_area_id) {
					this._users[uuid].rocks[rock.id].areaId = rock.reserved_area_id;
				}
			} else {
				this._users[uuid].rocks[rock.id] = {
					x: null,
					y: null
				}
			}
		}, this)
	},

	addReservedArea: function (uuid, onComplete) {
		var player = this._users[uuid];
		if (player === undefined) {
			debug("addReservedArea: user not found, uuid: " + uuid);
			return;
		} else if (player.rocks === undefined) {
			debug("addReservedArea: user with id: " + player.userId + ", uuid: " + player.uuid + " attempted to move a rock, but has none.");
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
		rockDAO.writeReservedAreaToTables(rockIds, path, uuid, function () {
			var reservedAreaId = uuid;
			for (var rockId in rocks) {
				if (rocks.hasOwnProperty(rockId)) {
					rocks[rockId].areaId = reservedAreaId;
					that._rocksOnGround[rockId].areaId = reservedAreaId;
				}
			}

			that._reservedAreas[reservedAreaId] = path;

			onComplete(path, rockIds);
		});
	},

	removeReservedArea: function (rocks, onComplete) {
		var rockIds = [];
		var areaId;
		for (var rockId in rocks) {
			if (rocks.hasOwnProperty(rockId)) {
				areaId = rocks[rockId].areaId;
				rockIds.push(rockId);
			}
		}

		var that = this;
		rockDAO.removeReservedAreaFromTables(rockIds, areaId, function () {
			for (var rockId in rocks) {
				if (rocks.hasOwnProperty(rockId)) {
					delete rocks[rockId].areaId;
					if(that._rocksOnGround[rockId] !== undefined) {
						delete that._rocksOnGround[rockId].areaId;
					}
				}
			}

			delete that._reservedAreas[areaId];

			onComplete(areaId, rockIds);
		});
	}
};