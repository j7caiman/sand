var query = require('../server/query_db');

module.exports = {
	fetchAllRocks: function (onComplete) {
		query('select id, x, y from rocks where x is not null and y is not null', onQueryComplete);

		function onQueryComplete(error, result) {
			if (error) {
				onComplete(error);
				return;
			}
			onComplete(null, result.rows);
		}
	},

	fetchRocksForPlayer: function (id, onComplete) {
		query('select id, x, y from rocks where owner_id = $1', [id], onComplete);
	},

	updateRockPosition: function (id, position, onComplete) {
		if (position === undefined) {
			query('update rocks set (x, y) = (null, null) where id = $1', [id], onComplete);
		} else {
			query('update rocks set (x, y) = ($1, $2) where id = $3', [position.x, position.y, id], onComplete);
		}
	}
};