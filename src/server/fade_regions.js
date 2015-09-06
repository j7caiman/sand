var debug = require('debug');

var query = require('./query_db');
var alterRegion = require('./alter_region');

var reservedAreas = require('./caches').getReservedAreas();

var globalConstants = require("../shared/global_constants");
var globalFunctions = require('../shared/global_functions');
var RegionNode = require('../shared/RegionNode');
var pointInsidePolygon = require('../shared/shared_rock_functions').pointInsidePolygon;

// constants
var timeBetweenFadesMinutes = 60;
var checkFrequencyMillis = 600000; // 10 minutes

module.exports = {
	initialize: initialize,
	addRegionToBeFaded: addRegionToBeFaded
};

function fadeRegion(regionName) {
	var moreFadingNeeded = false;
	var region = new RegionNode(regionName);

	alterRegion(regionName, transformFunction, onSuccess);

	function transformFunction(regionData) {
		for (var y = 0; y < regionData.length; y++) {
			for (var x = 0; x < regionData[0].length; x++) {
				if (regionData[y][x][1] > 0) {
					var positionOnCanvas = {
						x: x * globalConstants.kSandGrainWidth,
						y: y * globalConstants.kSandGrainWidth
					};
					var globalPosition = globalFunctions.toGlobalCoordinates(positionOnCanvas, region);

					if (!isPointInReservedArea(globalPosition)) {
						regionData[y][x][1]--;
						if (regionData[y][x][1] > 0) {
							moreFadingNeeded = true;
						}
					}
				}
			}
		}
	}

	function onSuccess() {
		if (moreFadingNeeded) {
			updateRegionFadeTimestamp(regionName);
		} else {
			removeRegionFromSchedule(regionName);
		}
	}
}

function isPointInReservedArea(point) {
	for (var id in reservedAreas) {
		if (reservedAreas.hasOwnProperty(id)) {
			var path = reservedAreas[id];
			if (pointInsidePolygon(point, path)) {
				return true;
			}
		}
	}
	return false;
}

function checkForRegionsToFade() {
	query("select region_name "
		+ "from regions "
		+ "where (fade_timestamp + interval '" + timeBetweenFadesMinutes + " minute') < now()", function (error, result) {
		if (error) {
			throw error;
		}

		result.rows.forEach(function (row) {
			fadeRegion(row.region_name);
		})
	});
}

function updateRegionFadeTimestamp(regionName) {
	query('update regions set fade_timestamp = now() where region_name = $1', [regionName], function (error) {
		if (error) {
			throw error;
		}
	});
}

function addRegionToBeFaded(regionName) {
	query('update regions set fade_timestamp = now() '
		+ 'where region_name = $1 and fade_timestamp is null;', [regionName], function (error) {
		if (error) {
			throw error;
		}
	});
}

function removeRegionFromSchedule(regionName) {
	query('update regions set fade_timestamp = null where region_name = $1', [regionName], function (error) {
		if (error) {
			throw error;
		}
	});
}

function initialize() {
	setInterval(checkForRegionsToFade, checkFrequencyMillis);
}
