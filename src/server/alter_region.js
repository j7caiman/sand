var zlib = require('zlib');
var query = require('./query_db');

module.exports = function alterRegion(regionName, transformFunction, onSuccess) {
	query('select region_data from regions where region_name = $1', [regionName], function (error, result) {
		if (error) {
			debug("error for region: " + regionName);
			throw error;
		}

		var compressedData = result.rows[0].region_data;
		zlib.unzip(compressedData, function (err, regionData) {
			if (err) {
				debug("error for region: " + regionName);
				throw err;
			}

			try {
				regionData = JSON.parse(regionData);
			} catch (error) {
				debug("error for region: " + regionName + " with regionData: " + regionData);
				throw error;
			}

			transformFunction(regionData);

			regionData = JSON.stringify(regionData);
			zlib.gzip(regionData, function (error, compressedData) {
				if (error) {
					throw error;
				}

				query('update regions set region_data = $2 where region_name = $1', [regionName, compressedData], function (error) {
					if (error) {
						throw error;
					}

					onSuccess();
				});
			});
		});
	});
};