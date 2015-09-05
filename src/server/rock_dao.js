var query = require('../server/query_db');

module.exports = {
	fetchActivatedUsers: function (onComplete) {
		query('select ' +
			'users.id as user_id, ' +
			'users.uuid, ' +
			'users.reserved_area_path, ' +
			'rocks.id as rock_id, ' +
			'rocks.x, ' +
			'rocks.y ' +
			'from users, rocks ' +
			'where users.id = rocks.owner_id', onComplete);
	},

	setRockPosition: function (id, position, onComplete) {
		query('update rocks set (x, y) = ($1, $2) where id = $3 returning owner_id', [position.x, position.y, id], function (error, result) {
			if (error) {
				onComplete(error);
			} else {
				var userId = result.rows[0].owner_id;
				onComplete(undefined, userId);
			}
		});
	},

	removeRockPositionAndReservedArea: function (id, onComplete) {
		query('update rocks set (x, y) = (null, null) where id = $1 returning owner_id', [id], function (error, result) {
			if (error) {
				onComplete(error);
				return;
			}

			var userId = result.rows[0].owner_id;
			query("update users set reserved_area_path = null where id = $1", [userId], function (error) {
				onComplete(error, userId);
			});
		});
	},

	writeReservedArea: function (userId, path, onComplete) {
		var queryParameters = [];
		var queryString = "update users set reserved_area_path = array[";
		var counter = 1;
		path.forEach(function (point, index) {
			queryParameters.push(point.x);
			queryParameters.push(point.y);
			if (index !== 0) {
				queryString += ",";
			}
			queryString += "array[$" + counter++ + "::integer,$" + counter++ + "::integer]";
		});
		queryParameters.push(userId);
		queryString += "] where id = $" + counter++;

		query(queryString, queryParameters,
			function (err) {
				if (err) {
					onComplete(err);
					return;
				}

				onComplete();
			}
		);
	},

	updateUuidAndFetchUserData: function (userId, uuid, onQueriesComplete) {
		query('update users set uuid = $2 where id = $1 returning reserved_area_path', [userId, uuid], function (err, result) {
			if (err) {
				onQueriesComplete(err);
				return;
			}

			var reservedArea = parseReservedAreaIfPresent(result.rows[0].reserved_area_path);

			query('select id, x, y from rocks where owner_id = $1', [userId], function (err, result) {
				if (err) {
					onQueriesComplete(err);
				} else {
					onQueriesComplete(undefined, reservedArea, result.rows);
				}
			});
		});
	},

	getRememberedUserWithData: function (uuid, newUuid, onQueriesComplete) {
		query('select ' +
			'users.id as user_id, ' +
			'users.email, ' +
			'users.reserved_area_path, ' +
			'rocks.id as rock_id, ' +
			'rocks.x, ' +
			'rocks.y ' +
			'from users, rocks ' +
			'where uuid = $1 and users.id = rocks.owner_id', [uuid], function (error, result) {
			if (error) {
				onQueriesComplete();
				return;
			}

			if (result.rows.length == 0) {
				onQueriesComplete();
				return;
			}

			var userId = result.rows[0].user_id;
			var email = result.rows[0].email;
			var reservedArea = parseReservedAreaIfPresent(result.rows[0].reserved_area_path);
			var rocks = result.rows.map(function (row) {
				return {
					id: row.rock_id,
					x: row.x,
					y: row.y
				}
			});

			query('update users set uuid = $2 where id = $1', [userId, newUuid], function (error) {
				if (error) {
					onQueriesComplete();
					return;
				}

				onQueriesComplete(userId, email, reservedArea, rocks);
			});
		});
	},

	parseReservedAreaIfPresent: parseReservedAreaIfPresent
};

function parseReservedAreaIfPresent(path) {
	if (path !== null) {
		return path.map(function (point) {
			return {
				x: point[0],
				y: point[1]
			}
		});
	} else {
		return undefined;
	}
}