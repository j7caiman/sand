var fs = require('fs');
var zlib = require('zlib');

var basePath = './resources/world_datastore/';

var freeToGzip = true;

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
					return freeToGzip === true;
				},
				function () {
					gzipSomething(completePath, file);
				}
			);
		});
	});
});

function gzipSomething(completePath, file) {
	freeToGzip = false;

	var data = fs.readFileSync(completePath);
	zlib.gzip(data, function (error, compressedData) {
		fs.writeFileSync(completePath, compressedData);
		var newPath = completePath + '.gz';
		fs.renameSync(completePath, newPath);
		console.log(file + " rewritten, regions fixed: " + ++regionsFixed);
		freeToGzip = true;
	});
}

function poll(condition, callback) {
	var interval = 50;

	(function p() {
		if (condition()) {
			callback();
		} else {
			setTimeout(p, interval);
		}
	})();
}
