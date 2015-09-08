var debug = require('debug')('sand');
var rockDAO = require('./rock_dao');
var rockFunctions = require('./../shared/shared_rock_functions');

var uuidToPositionMap = (function () {
	var map = {};

	function get(uuid) {
		return map[uuid];
	}

	function getAll() {
		var all = [];
		for (var uuid in map) {
			if (map.hasOwnProperty(uuid)) {
				all.push({
					uuid: uuid,
					position: map[uuid]
				});
			}
		}
		return all;
	}

	function update(uuid, position) {
		map[uuid] = position;
	}

	function remove(uuid) {
		if (map[uuid] === undefined) {
			debug('disconnect event received from player: ' + uuid + 'but player was not present');
		} else {
			delete map[uuid];
		}
	}

	return {
		get: get,
		getAll: getAll,
		update: update,
		remove: remove
	}
})();

var users = (function () {
	var map = {};

	var uuidToUserIdMap = (function () {
		var map = {};

		function get(uuid) {
			return map[uuid];
		}

		function add(uuid, userId) {
			map[uuid] = userId;
		}

		return {
			get: get,
			add: add
		}
	})();

	var reservedAreas = (function () {
		var map = {};

		function getAll() {
			return map;
		}

		function exists(userId) {
			return map[userId] !== undefined;
		}

		function add(userId, path) {
			map[userId] = path;
		}

		function remove(userId) {
			delete map[userId];
		}

		return {
			getAll: getAll,
			exists: exists,
			add: add,
			remove: remove
		}
	})();

	function User(userId, reservedArea, rocks) {
		this._id = userId;

		if (reservedArea !== undefined) {
			reservedAreas.add(userId, reservedArea);
		}

		this._rocks = {};
		rocks.forEach(function (rock) {
			this.addRock(rock);
		}, this);
	}

	User.prototype = {
		constructor: User,
		getId: function () {
			return this._id;
		},
		hasRock: function (id) {
			return this._rocks[id] !== undefined;
		},
		getRock: function (id) {
			return this._rocks[id];
		},
		placeRock: function (rockId, position) {
			this.getRock(rockId).place(position);
		},
		pickUpRock: function (rockId) {
			this.getRock(rockId).pickUp();
			if (this.reservedAreaExists()) {
				this.removeReservedArea();

				var rocksOnGroundIds = [];
				var rocks = this.getAllRocks();
				for (rockId in rocks) {
					if (rocks.hasOwnProperty(rockId)) {
						if (this.getRock(rockId).onGround()) {
							rocksOnGroundIds.push(rockId);
						}
					}
				}

				return rocksOnGroundIds;
			}
		},
		getAllRocks: function () {
			return this._rocks;
		},
		addRock: function (rock) {
			this._rocks[rock.id] = new Rock(rock.x, rock.y);
		},
		reservedAreaExists: function () {
			return reservedAreas.exists(this._id);
		},
		addReservedArea: function (path) {
			reservedAreas.add(this._id, path);
		},
		removeReservedArea: function () {
			reservedAreas.remove(this._id);
		}
	};

	function Rock(x, y) {
		this.x = x;
		this.y = y;
	}

	Rock.prototype = {
		constructor: Rock,
		pickUp: function () {
			this.x = null;
			this.y = null;
		},
		place: function (position) {
			this.x = position.x;
			this.y = position.y;
		},
		onGround: function () {
			return this.x !== null && this.y !== null;
		}
	};

	function get(userId) {
		return map[userId];
	}

	function add(userId, uuid, reservedArea, rocks) {
		map[userId] = new User(userId, reservedArea, rocks);
		uuidToUserIdMap.add(uuid, userId);
	}

	function exists(userId) {
		return get(userId) !== undefined;
	}

	function getByUuid(uuid) {
		var userId = uuidToUserIdMap.get(uuid);
		if (userId !== undefined) {
			return get(userId);
		}
	}

	function existsByUuid(uuid) {
		return uuidToUserIdMap.get(uuid) !== undefined;
	}

	function getReservedAreas() {
		return reservedAreas.getAll();
	}

	function getRocksOnGround() {
		var rocksOnGround = {};
		for (var userId in map) {
			if (map.hasOwnProperty(userId)) {
				var rocksFromUser = get(userId).getAllRocks();
				for (var rockId in rocksFromUser) {
					if (rocksFromUser.hasOwnProperty(rockId)) {
						var rock = rocksFromUser[rockId];
						if (rock.onGround()) {
							rocksOnGround[rockId] = {x: rock.x, y: rock.y};
						}
					}
				}
			}
		}

		return rocksOnGround;
	}

	function getActivatedRockIds() {
		var rockIds = [];
		for (var userId in map) {
			if (map.hasOwnProperty(userId)) {
				var user = get(userId);
				if (user.reservedAreaExists()) {
					var rocks = user.getAllRocks();
					for (var rockId in rocks) {
						if (rocks.hasOwnProperty(rockId)) {
							rockIds.push(rockId);
						}
					}
				}
			}
		}

		return rockIds;
	}

	return {
		add: add,
		get: get,
		exists: exists,
		getByUuid: getByUuid,
		existsByUuid: existsByUuid,
		getReservedAreas: getReservedAreas,
		getRocksOnGround: getRocksOnGround,
		getActivatedRockIds: getActivatedRockIds
	}
})();

function validateRockId(uuid, rockId) {
	var user = users.getByUuid(uuid);
	if (user === undefined) {
		debug("user not found, uuid: " + uuid);
		return false;
	}
	if (!user.hasRock(rockId)) {
		debug("user: " + user.getId() + " with uuid: " + uuid + " does not own rock: " + rockId);
		return false;
	}

	return true;
}

module.exports = {
	initialize: function (onComplete) {
		rockDAO.fetchActivatedUsers(function (error, result) {
			if (error) {
				throw error;
			}

			result.rows.forEach(function (row) {
				var rock = {
					id: row.rock_id,
					x: row.x,
					y: row.y
				};

				if (users.exists(row.user_id)) {
					users.get(row.user_id).addRock(rock);
				} else {
					var reservedArea = rockDAO.parseReservedAreaIfPresent(row.reserved_area_path);

					users.add(row.user_id, row.uuid, reservedArea, [rock]);
				}
			});

			onComplete();
		});
	},

	addOrUpdatePlayer: uuidToPositionMap.update,
	getCurrentPlayers: uuidToPositionMap.getAll,
	removePlayer: uuidToPositionMap.remove,

	addLoggedInUser: users.add,
	isUuidValid: users.existsByUuid,
	getRocksOnGround: users.getRocksOnGround,
	getActivatedRockIds: users.getActivatedRockIds,
	getReservedAreas: users.getReservedAreas,

	rockPickedUpUpdate: function (uuid, rockId, onSuccess) {
		if (!validateRockId(uuid, rockId)) {
			return;
		}

		rockDAO.removeRockPositionAndReservedArea(rockId, function (error, userId) {
			if (error) {
				return;
			}

			var remainingRocksOnGround = users.get(userId).pickUpRock(rockId);
			if (remainingRocksOnGround === undefined) {
				onSuccess();
			} else {
				onSuccess(userId, remainingRocksOnGround)
			}

		});
	},

	rockPutDownUpdate: function (uuid, rockId, position, onSuccess) {
		if (!validateRockId(uuid, rockId)) {
			return;
		}

		rockDAO.setRockPosition(rockId, position, function (error, userId) {
			if (error) {
				return;
			}

			users.get(userId).placeRock(rockId, position);

			onSuccess();
		});
	},

	addReservedArea: function (uuid, onSuccess) {
		var user = users.getByUuid(uuid);
		if (user === undefined) {
			debug("addReservedArea: user not found, uuid: " + uuid);
			return;
		}

		var rocks = user.getAllRocks();
		var rockId;
		var points = [];
		var rockIds = [];
		for (rockId in rocks) {
			if (rocks.hasOwnProperty(rockId)) {
				var rock = rocks[rockId];
				if (rock.x === null || rock.y === null) {
					return;
				}

				rockIds.push(rockId);
				points.push(rock);
			}
		}

		var path = rockFunctions.getReservedPerimeterIfValid(points);
		if (!path) {
			return;
		}

		rockDAO.writeReservedArea(user.getId(), path, function (error) {
			if (error) {
				return;
			}

			user.addReservedArea(path);
			onSuccess(user.getId(), path, rockIds);
		});
	}
};