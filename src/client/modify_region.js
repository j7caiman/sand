sand.modifyRegion = {
	makeFootprint: function (globalPosition, brushString) {
		var brush = sand.modifyRegion.brushes[brushString];
		brush.forEach(function(brushComponent) {
			var position = globalPosition;
			if(brushComponent.offset !== undefined) {
				position.x = brushComponent.offset.x + globalPosition.x;
				position.y = brushComponent.offset.y + globalPosition.y;
			}

			var changedArea = sand.globalFunctions.createBoundingBox(
				position,
				brushComponent.radius
			);
			var regionNames = sand.globalFunctions.findRegionsInRect(changedArea);
			regionNames.forEach(function(regionName) {
				var region = sand.allRegions[regionName];
				// region not guaranteed to be loaded, since the rectangle may reference an area beyond the player
				if(region !== undefined) {
					brushComponent.apply(
						region.getData(),
						sand.globalFunctions.toLocalCoordinates(position, region)
					);
				}
			});
		});
	},

	regenerateTerrain: function () {
		var that = this;
		if(!that.generateLargeDune) {
			return;
		}

		var zipCode = sand.globalFunctions.getRegionZipCode(sand.currentRegion.getName());
		var regionNames = that.listRegionNamesInZipCode(zipCode);

		sand.globalFunctions.addMoreRegions(onComplete, regionNames);

		function onComplete() {
			regionNames.forEach(function (regionName) {
				(function zeroOutRegion(regionData, width) {
					for (var y = 0; y < width; y++) {
						for (var x = 0; x < width; x++) {
							regionData[y][x] = 0;
						}
					}
				})(sand.allRegions[regionName].getData(), sand.constants.kRegionWidth);
			});

			var regions = regionNames.map(function (regionName) {
				return sand.allRegions[regionName];
			});

			that.generateLargeDune(regions);
			that.generateBumps(regions);

			regions.forEach(function (region) {
				sand.canvasUpdate.drawRegionToCanvas(region);
			}, this);
		}
	}
};