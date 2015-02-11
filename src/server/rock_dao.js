var query = require('../server/query_db');

module.exports = {
	fetchRocksOnGround: function (onComplete) {
		query('select id, x, y from rocks where x is not null and y is not null', function (error, result) {
			if (error) {
				onComplete(error);
				return;
			}
			onComplete(null, result.rows);
		});
	},

	fetchRocksForPlayer: function (id, onComplete) {
		query('select id, x, y, reserved_area_id from rocks where owner_id = $1', [id], onComplete);
	},

	fetchReservedAreas: function(onComplete) {
		query('select id, path from reserved_areas', onComplete);
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

	removeReservedAreaFromTables: function (rockIds, areaId, onComplete) {
		query("update rocks set reserved_area_id = null where id in ($1, $2, $3, $4)", rockIds, function(err) {
			if (err) {
				return;
			}

			query("delete from reserved_areas where id = $1", [areaId], function(err) {
				if (err) {
					return;
				}

				onComplete();
			});
		});
	},

	writeReservedAreaToTables: function (rockIds, path, onComplete) {
		var queryParameters = [];
		var queryString = "insert into reserved_areas (path) values (array[";
		var counter = 1;
		path.forEach(function (point, index) {
			queryParameters.push(point.x);
			queryParameters.push(point.y);
			if (index === 0) {
				queryString += "array[$" + counter++ + "::integer,$" + counter++ + "::integer]";
			} else {
				queryString += ",array[$" + counter++ + "::integer,$" + counter++ + "::integer]";
			}
		});
		queryString += "]) returning id";

		query(queryString, queryParameters,
			function (err, result) {
				if (err) {
					return;
				}

				var reservedAreaId = result.rows[0].id;
				query("update rocks " +
					"set reserved_area_id = updated_rocks.reserved_area_id " +
					"from (values" +
						"($1::integer, $5::integer), " +
						"($2::integer, $5::integer), " +
						"($3::integer, $5::integer), " +
						"($4::integer, $5::integer)" +
					") as updated_rocks(id, reserved_area_id)" +
					"where rocks.id = updated_rocks.id",
					[rockIds[0], rockIds[1], rockIds[2], rockIds[3], reservedAreaId],
					function (err) {
						if (err) {
							return;
						}

						onComplete(reservedAreaId);
					}
				);
			}
		);
	}
};