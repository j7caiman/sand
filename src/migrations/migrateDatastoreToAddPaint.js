var fs = require('fs');

var basePath = '../resources/world_datastore/';

var regionsFixed = 0;
fs.readdir(basePath, function (err, zipCodeDirs) {
	var numZipCodes = zipCodeDirs.length;
	console.log(numZipCodes + " zip codes in directory");
	zipCodeDirs.forEach(function (dir) {
		var zipCodePath = basePath + dir;
		fs.readdir(zipCodePath, function (err, files) {
			var numFilesPerZipCode = files.length;
			console.log(numFilesPerZipCode + " to be rewritten in zip code: " + dir);
			files.forEach(function (file) {
				var completePath = zipCodePath + '/' + file;
				fs.readFile(completePath, function (err, data) {
					var parsedData = JSON.parse(data);
					for (var y = 0; y < parsedData.length; y++) {
						for (var x = 0; x < parsedData[0].length; x++) {
							parsedData[y][x] = [parsedData[y][x], 0];
						}
					}

					fs.writeFile(completePath, JSON.stringify(parsedData), function() {
						console.log(file + " rewritten, regions fixed: " + ++regionsFixed);
					});

				});
			});
		});
	});
});

