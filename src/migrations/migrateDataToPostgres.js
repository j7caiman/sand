var fs = require('fs');
var query = require('../server/query_db');

var basePath = './resources/world_datastore/';

var isFreeToMigrate = true;

var regionsFixed = 0;
fs.readdir(basePath, function (err, zipCodeDirs) {
	var numZipCodes = zipCodeDirs.length;
	console.log(numZipCodes + " zip codes in directory");
	zipCodeDirs.forEach(function (dir) {
		var zipCodePath = basePath + dir;

		var files = fs.readdirSync(zipCodePath);
		var numFilesPerZipCode = files.length;
		console.log(numFilesPerZipCode + " to be rewritten in zip code: " + dir);
		files.forEach(function (file) {
			var completePath = zipCodePath + '/' + file;

			poll(
				function () {
					return isFreeToMigrate === true;
				},
				function () {
					var regionName = file.split('.')[0].substring(1);
					gzipSomething(completePath, regionName);
				}
			);
		});
	});
});

function gzipSomething(path, regionName) {
	isFreeToMigrate = false;

	var data = fs.readFileSync(path);
	query('insert into regions (region_name, region_data) values ($1, $2)', [regionName, data], function (error) {
		if (error) {
			throw error;
		}

		console.log(regionName + " rewritten, regions fixed: " + ++regionsFixed);
		isFreeToMigrate = true;
	});
}

function poll(condition, callback) {
	var interval = 10;

	(function p() {
		if (condition()) {
			callback();
		} else {
			setTimeout(p, interval);
		}
	})();
}
