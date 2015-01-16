var sand = {
	allRegions: {},
	batchedFootprints: [],
	elephantPath: []
};

$(document).ready(function() {
	sand.globalFunctions.createCanvas(
		'cocos2d_gameCanvas', // game canvas is referenced in project.json
		window.innerWidth,
		window.innerHeight
	);
	cc.game.run();
});

cc.game.onStart = function() {
	var playerData = (function() {
		$.cookie.json = true;
		var playerDataCookie = $.cookie('playerData');
		if (playerDataCookie !== undefined) {
			return playerDataCookie;
		} else {
			function generateUUID() {
				return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
					var r = Math.random()*16|0;
					var v = (c == 'x') ? r : (r&0x3|0x8);
					return v.toString(16);
				});
			}

			var playerData = {
				uuid: generateUUID(),
				lastPosition: {
					x: 100,
					y: 100
				}
			};
			$.cookie('playerData', playerData, {expires: 7});

			return playerData;
		}
	})();
	sand.globalCoordinates = playerData.lastPosition;
	sand.uuid = playerData.uuid;

	sand.globalFunctions.addMoreRegions(onRegionInitializationComplete);

	function onRegionInitializationComplete() {
		var currentRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(sand.globalCoordinates);
		sand.currentRegion = sand.allRegions[currentRegionName];

		var localPlayerPosition = sand.globalFunctions.toLocalCoordinates(sand.globalCoordinates);
		var position = {
			x: window.innerWidth / 2 - localPlayerPosition.x,
			y: window.innerHeight / 2 - localPlayerPosition.y
		};
		sand.currentRegion.getSprite().setPosition(position);

		cc.screen.requestFullScreen();
		cc.view.setResolutionPolicy(cc.ResolutionPolicy.NO_BORDER);
		cc.view.resizeWithBrowserSize(true);
		cc.view.adjustViewPort(true);
		cc.LoaderScene.preload(g_resources, function () {
			cc.director.runScene(new GameScene());
		}, this);
	}
};

sand.globalFunctions = {
	addFootprintToQueue: function(location, brushStrokeType) {
		var roundedLocation = {
			x: Math.round(location.x),
			y: Math.round(location.y)
		};

		var print = {
			location: roundedLocation,
			brush: brushStrokeType
		};

		sand.batchedFootprints.push(print);
		sand.socket.emit('footprint', print);
	},

	addMoreRegions: function (onComplete, regionNames) {
		if(regionNames === undefined) {
			var padding = sand.constants.kLoadMoreRegionsThreshold;
			var preloadThresholdRect = {
				x: sand.globalCoordinates.x - (window.innerWidth / 2 + padding),
				y: sand.globalCoordinates.y - (window.innerHeight / 2 + padding),
				width: window.innerWidth + (2 * padding),
				height: window.innerHeight + (2 * padding)
			};
			regionNames = sand.globalFunctions.findRegionsInRect(preloadThresholdRect);
		}

		var newRegionNames = [];
		regionNames.forEach(function(regionName) {
			if (!sand.allRegions.hasOwnProperty(regionName)) {
				newRegionNames.push(regionName);
			}
		});

		if (newRegionNames.length === 0) {
			if (onComplete !== undefined) {
				onComplete();
			}
		} else {
			$.ajax({
				url: "fetch_region",
				type: "POST",
				data: JSON.stringify(newRegionNames),
				contentType: "application/json",
				success: function (responseData) {
					var allRegions = sand.allRegions;

					var dataForNewRegions = responseData.regions;
					for (var regionName in dataForNewRegions) {
						if (dataForNewRegions.hasOwnProperty(regionName)) {
							allRegions[regionName] = new RegionNode(regionName);
							allRegions[regionName].setData(dataForNewRegions[regionName]);

							var canvas = sand.globalFunctions.createCanvas(regionName, sand.constants.kCanvasWidth);
							canvas.style.display = 'none';
							allRegions[regionName].setCanvas(canvas);

							var sprite = new cc.Sprite(new cc.Texture2D());
							sprite.setName(regionName);
							sprite.setAnchorPoint(0, 0);
							sprite.getTexture().initWithElement(allRegions[regionName].getCanvas());
							sprite.getTexture().handleLoadedTexture();
							sprite.setVisible(false);
							allRegions[regionName].setSprite(sprite);

							// on startup, BackgroundLayer has not yet been initialized. In that case, the sprites are
							// later added during BackgroundLayer's init function.
							if (sand.backgroundLayer !== undefined) {
								sand.backgroundLayer.addChild(sprite);
							}
						}
					}

					/**
					 * new regions have been downloaded,
					 * so reinitialize each region's 'adjacent region' references
					 */
					for (regionName in allRegions) {
						if (allRegions.hasOwnProperty(regionName)) {
							allRegions[regionName].initializeAdjacentNodes();
						}
					}

					// draw new regions. note: relies on adjacent nodes being initialized
					for (regionName in dataForNewRegions) {
						if (dataForNewRegions.hasOwnProperty(regionName)) {
							sand.canvasUpdate.drawRegionToCanvas(allRegions[regionName]);
						}
					}

					if (onComplete !== undefined) {
						onComplete();
					}
				}
			});
		}
	},

	updateBackgroundSpriteLocations: function() {
		var playerScreenPosition = sand.elephantLayer.playerSprite.getPosition();
		var bottomLeftCornerOfViewport = {
			x:  sand.globalCoordinates.x - playerScreenPosition.x,
			y:  sand.globalCoordinates.y - playerScreenPosition.y
		};

		var viewport = {
			x: bottomLeftCornerOfViewport.x,
			y: bottomLeftCornerOfViewport.y,
			width: window.innerWidth,
			height: window.innerHeight
		};
		var visibleRegionNames = sand.globalFunctions.findRegionsInRect(viewport);

		var indexOfCurrentRegion = undefined;
		var previousRegionYCoordinate;
		var numColumns;
		visibleRegionNames.forEach(function(regionName, index) {
			if(sand.currentRegion.getName() === regionName) {
				indexOfCurrentRegion = index;
			}
			var yCoordinate = regionName.split("_")[1];
			if(numColumns === undefined && index !== 0 && yCoordinate !== previousRegionYCoordinate) {
				numColumns = index;
			}

			previousRegionYCoordinate = yCoordinate;
		});
		if(numColumns === undefined) {
			numColumns = 1;
		}

		var currentRegionOffset = {
			x: indexOfCurrentRegion % numColumns,
			y: Math.floor(indexOfCurrentRegion / numColumns)
		};
		var currentRegionLocation = sand.currentRegion.getSprite().getPosition();

		visibleRegionNames.forEach(function(regionName, index) {
			var region = sand.allRegions[regionName];
			var sprite = region.getSprite();

			var regionOffset = {
				x: index % numColumns,
				y: Math.floor(index / numColumns)
			};

			var x = currentRegionLocation.x - sand.constants.kCanvasWidth * (currentRegionOffset.x - regionOffset.x);
			var y = currentRegionLocation.y - sand.constants.kCanvasWidth * (currentRegionOffset.y - regionOffset.y);
			sprite.setPosition(x, y);
			sprite.setVisible(true);
		});
	},

	createCanvas: function (id, width, height) {
		if(height === undefined) { // creates square canvas
			height = (width);
		}
		var canvas = document.createElement('canvas');
		canvas.id = id;
		canvas.width = width;
		canvas.height = height;
		document.body.appendChild(canvas);
		return canvas;
	},

	findRegionNameFromAbsolutePosition: function (position) {
		var xCoordinate = Math.floor(position.x / sand.constants.kCanvasWidth);
		var yCoordinate = Math.floor(position.y / sand.constants.kCanvasWidth);
		return xCoordinate + "_" + yCoordinate;
	},

	/**
	 * returns an array of region names that are inside the bounding rectangle
	 * array is organized from lowest to highest, first by the y coordinate,
	 * then by the x coordinate.
	 */
	findRegionsInRect: function (rect) {
		var xCoordinates = [];
		for (var x = rect.x; x < rect.x + rect.width; x += sand.constants.kCanvasWidth) {
			xCoordinates.push(x);
		}
		xCoordinates.push(rect.x + rect.width);

		var yCoordinates = [];
		for (var y = rect.y; y < rect.y + rect.height; y += (sand.constants.kCanvasWidth)) {
			yCoordinates.push(y);
		}
		yCoordinates.push(rect.y + rect.height);

		var coordinates = [];
		for (y = 0; y < yCoordinates.length; y++) {
			for (x = 0; x < xCoordinates.length; x++) {
				coordinates.push({
					x: xCoordinates[x],
					y: yCoordinates[y]
				})
			}
		}

		var regionNames = [];
		for (var i = 0; i < coordinates.length; i++) {
			var item = sand.globalFunctions.findRegionNameFromAbsolutePosition(coordinates[i]);
			if (regionNames.indexOf(item) == -1) {
				regionNames.push(item);
			}
		}

		return regionNames;
	},

	mod: function(a, n) { return ((a % n) + n) % n; },

	calculateDistance: function (point1, point2) {
		var xDelta = point2.x - point1.x;
		var yDelta = point2.y - point1.y;
		return Math.sqrt((xDelta * xDelta) + (yDelta * yDelta));
	}
};
