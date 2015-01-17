sand.modifyRegion = {
	brushes: {
		painting: {
			radius: 8,
			pointOfImpact: 2
		},

		walking: {
			radius: 1.5,
			pointOfImpact: 0
		}
	},

	makeFootprint: function (changedArea, globalPosition, brush) {
		var regionNames = sand.globalFunctions.findRegionsInRect(changedArea);
		regionNames.forEach(function(regionName) {
			var region = sand.allRegions[regionName];
			// region not guaranteed to be loaded, since the rectangle may reference an area beyond the player
			if(region !== undefined) {
				sand.modifyRegion.imprintSphere(
					region.getData(),
					sand.globalFunctions.toLocalCoordinates(globalPosition, region),
					sand.modifyRegion.brushes[brush].radius,
					sand.modifyRegion.brushes[brush].pointOfImpact);
			}
		});
	},

	/**
	 * crater is shaped as follows:
	 *
	 *
	 * - -     -                                 -      - ----------
	 *          -                              -
	 *             ---__              __ --
	 *                    ' --------
	 *
	 * radius: radius of entire element
	 * pointOfImpact: the height at which the sphere which forms the crater is located
	 *  - note that in the diagram above, pointOfImpact would be located slightly above the word "follows"
	 *
	 */
	imprintSphere: function (regionData, positionOnCanvas, radius, pointOfImpactZ) {
		const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
		var pointOfImpact = {
			x: Math.floor(positionOnCanvas.x / sandGrainWidth),
			y: Math.floor(positionOnCanvas.y / sandGrainWidth),
			z: pointOfImpactZ
		};

		const regionWidth = sand.constants.kRegionWidth;
		for (var y = 0; y < regionWidth; y++) {
			for (var x = 0; x < regionWidth; x++) {
				var localCoordinates = {
					x: x,
					y: y,
					z: regionData[y][x]
				};

				var delta = {
					x: localCoordinates.x - pointOfImpact.x,
					y: localCoordinates.y - pointOfImpact.y
				};

				var newZ = Math.sqrt(radius * radius - ( delta.x * delta.x + delta.y * delta.y )) - pointOfImpact.z;
				if (newZ > 0) {
					regionData[y][x] -= Math.floor(newZ);
				}
			}
		}
	},

	settle: function () {
		var regionData = sand.currentRegion.getData();

		const gridWidth = regionData[0].length;
		for (var y = 1; y < gridWidth - 1; y++) {
			for (var x = 1; x < gridWidth - 1; x++) {
				var currentLocation = {x: x, y: y}; //note: is not the center of the block
				var currentDepth = regionData[currentLocation.y][currentLocation.x];
				var topAdjacentDepth = regionData[currentLocation.y - 1][currentLocation.x];
				var rightAdjacentDepth = regionData[currentLocation.y][currentLocation.x + 1];
				var bottomAdjacentDepth = regionData[currentLocation.y + 1][currentLocation.x];
				var leftAdjacentDepth = regionData[currentLocation.y][currentLocation.x - 1];

				var depths = [
					{label: "current", depth: currentDepth},
					{label: "top", depth: topAdjacentDepth},
					{label: "right", depth: rightAdjacentDepth},
					{label: "bottom", depth: bottomAdjacentDepth},
					{label: "left", depth: leftAdjacentDepth}
				];
				depths.sort(function (first, second) {
					return first.depth - second.depth;
				});

				var lowestPoint = depths[0];

				if (currentDepth > lowestPoint.depth + 2) {
					regionData[currentLocation.y][currentLocation.x]--;
					switch (lowestPoint.label) {
						case "top":
							regionData[currentLocation.y - 1][currentLocation.x]++;
							break;
						case "right":
							regionData[currentLocation.y][currentLocation.x + 1]++;
							break;
						case "bottom":
							regionData[currentLocation.y + 1][currentLocation.x]++;
							break;
						case "left":
							regionData[currentLocation.y][currentLocation.x - 1]++;
							break;
					}
				}
			}
		}
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