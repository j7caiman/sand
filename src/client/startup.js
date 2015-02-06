var sand = {
	allRegions: {},
	batchedFootprints: [],
	elephantPath: [],
	playerState: {}
};

$(document).ready(function() {
	var canvas = document.createElement('canvas');
	canvas.id = 'cocos2d_gameCanvas'; // game canvas is referenced in project.json
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);

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
		$('#loading').hide();
		$('#signIn').show();

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

							var canvas = document.createElement('canvas');
							canvas.id = regionName;
							canvas.width = sand.constants.kCanvasWidth;
							canvas.height = (sand.constants.kCanvasWidth);
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
			try {
				ga('send', 'event', 'regions', 'addMore', newRegionNames, newRegionNames.length);				
			} catch (err) {
				//  Occasionally this function will throw an error when the client has blocked google analytics
			}
		}
	},

	_fly: function(disable) {
		if(disable !== undefined) {
			sand.constants.kElephantSpeed = 50;
			sand.constants.kScrollSpeed = 80;
			sand.playerState.flying = false;
			return "landed."
		}
		sand.constants.kElephantSpeed *= 2;
		sand.constants.kScrollSpeed *= 2;
		sand.playerState.flying = true;
		return "current speed: " + sand.constants.kElephantSpeed + " kilophants/hour."
	},

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

	getPositionOnScreenFromGlobalCoordinates: function (globalPosition) {
		var localPosition = sand.globalFunctions.toLocalCoordinates(globalPosition);
		var currentViewport = sand.currentRegion.getSprite().getPosition();
		return {
			x: currentViewport.x + localPosition.x,
			y: currentViewport.y + localPosition.y
		};
	},

	convertOnScreenPositionToGlobalCoordinates: function (onScreenPosition) {
		var backgroundPosition = sand.currentRegion.getSprite();
		var localPosition = {
			x: onScreenPosition.x - backgroundPosition.x,
			y: onScreenPosition.y - backgroundPosition.y
		};

		return sand.globalFunctions.toGlobalCoordinates(localPosition);
	},

	mod: function(a, n) { return ((a % n) + n) % n; }
};
