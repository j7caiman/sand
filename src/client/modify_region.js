var sand = sand || {};
sand.modifyRegion = sand.modifyRegion || {};

sand.modifyRegion.makeFootprint = function (print) {
	var brush = sand.brushes[print.brush];
	var position = print.location;

	var changedArea = sand.globalFunctions.createBoundingBox(
		position,
		brush.radius
	);
	var regionNames = sand.globalFunctions.findRegionsInRect(changedArea);
	regionNames.forEach(function (regionName) {
		var region = sand.allRegions[regionName];
		// region not guaranteed to be loaded, since the rectangle may reference an area beyond the player
		if (region !== undefined) {
			brush.applyBrush(
				region.getData(),
				sand.globalFunctions.toLocalCoordinates(position, region),
				print.additionalData
			);
		}
	});
};

sand.modifyRegion.regenerateTerrain = function () {
	if (sand.duneFunctions === undefined) {
		return;
	}

	var zipCode = sand.globalFunctions.getRegionZipCode(sand.currentRegion.getName());
	var regionNames = sand.duneFunctions.listRegionNamesInZipCode(zipCode);

	sand.globalFunctions.addMoreRegions(onComplete, regionNames);

	function onComplete() {
		regionNames.forEach(function (regionName) {
			(function zeroOutRegion(regionData, width) {
				for (var y = 0; y < width; y++) {
					for (var x = 0; x < width; x++) {
						regionData[y][x] = [0, 0];
					}
				}
			})(sand.allRegions[regionName].getData(), sand.constants.kRegionWidth);
		});

		var regions = regionNames.map(function (regionName) {
			return sand.allRegions[regionName];
		});

		sand.duneFunctions.generateLargeDune(regions);
		sand.duneFunctions.generateBumps(regions);

		regions.forEach(function (region) {
			sand.canvasUpdate.drawRegionToCanvas(region);
		});
	}
};

sand.modifyRegion.createPointsAlongPath = function (path) {
	var spacing = 10;

	var points = [];
	for (var i = 0; i < path.length; i++) {
		var point = path[i];
		var nextPoint = path[(i + 1) % path.length];

		var distance = (function (point1, point2) {
			var xDelta = point2.x - point1.x;
			var yDelta = point2.y - point1.y;
			return {
				x: xDelta,
				y: yDelta,
				h: Math.sqrt((xDelta * xDelta) + (yDelta * yDelta))
			}
		})(point, nextPoint);

		var displacement = {
			x: spacing * (distance.x / distance.h),
			y: spacing * (distance.y / distance.h)
		};

		var k = 0;
		for (var j = 0; j < distance.h; j += spacing) {
			points.push({
				x: point.x + (k * displacement.x),
				y: point.y + (k++ * displacement.y)
			});
		}
	}

	return points;
};