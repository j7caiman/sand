var query = require('../server/query_db');

module.exports = {
	fetchAllRocks: function (onComplete) {
		query('select owner_id, id, x, y from rocks', onComplete);
	},

	fetchUuidsForUsersWithRocks: function (onComplete) {
		query('select id, uuid from users where email_validated = true', onComplete);
	},

	fetchReservedAreas: function (onComplete) {
		query('select reserved_area_path, uuid from users where reserved_area_path is not null', onComplete);
	},

	updateRockPosition: function (id, position, onComplete) {
		if (typeof position == 'function') {
			onComplete = position;
			position = undefined;
		}

		if (position === undefined) {
			query('update rocks set (x, y) = (null, null) where id = $1', [id], onComplete);
		} else {
			query('update rocks set (x, y) = ($1, $2) where id = $3', [position.x, position.y, id], onComplete);
		}
	},

	deleteReservedArea: function (userId, onComplete) {
		query("update users set reserved_area_path = null where id = $1", [userId], function (err) {
			if (err) {
				return;
			}

			onComplete();
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
					return;
				}

				onComplete();
			}
		);
	},

	updateUuidAndFetchRocks: function (userId, uuid, onQueriesComplete) {
		query('update users set uuid = $2 where id = $1', [userId, uuid], function (err) {
			if (err) {
				onQueriesComplete(err);
				return;
			}

			fetchRocksForPlayer(userId, function(err, result) {
				if (err) {
					onQueriesComplete(err);
				} else {
					onQueriesComplete(undefined, result.rows);
				}
			});
		});
	},

	rememberUserAndFetchRocks: function (uuid, onQueriesComplete) {
		query('select id, email from users where uuid = $1', [uuid], function (error, result) {
			if (error) {
				onQueriesComplete();
				return;
			}

			if (result.rows.length == 0) {
				onQueriesComplete();
				return;
			}

			var userId = result.rows[0].id;
			var email = result.rows[0].email;
			fetchRocksForPlayer(userId, function (error, result) {
				if (error) {
					onQueriesComplete();
					return;
				}

				onQueriesComplete(userId, email, result.rows);
			});
		});
	}
};

function fetchRocksForPlayer(id, onComplete) {
	query('select id, x, y from rocks where owner_id = $1', [id], onComplete);
}