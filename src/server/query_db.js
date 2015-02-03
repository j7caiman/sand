var debug = require('debug')('sand');

var postgres = require('pg');
var connectionString = 'postgres://jon:@localhost/sand'; // postgres://<user>:<password>@<host>/<database>

module.exports = function (queryString, queryParameters, onComplete) {
	if (typeof queryParameters == 'function') { // normalize parameters
		onComplete = queryParameters;
		queryParameters = [];
	}

	postgres.connect(connectionString, function (err, client, recycleConnection) {
		if (err) {
			debug('error: connection to database failed. connection string: \"' + connectionString + '\" error: ' + err);
			recycleConnection(err);
			onComplete(err);
			return;
		}

		client.query(
			queryString,
			queryParameters,
			function (err, result) {
				recycleConnection();

				if (err) {
					debug('error: query failed: \"' + queryString + '\", \"' + queryParameters + "\" error: " + err);
					onComplete(err);
				} else {
					onComplete(null, result);
				}
			}
		);
	});
};