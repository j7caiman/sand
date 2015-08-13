var query = require('../server/query_db');

module.exports = {
	fetchRocksForPlayer: function (id, onComplete) {
		query('select id, x, y from rocks where owner_id = $1', [id], onComplete);
	},

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
	}
};