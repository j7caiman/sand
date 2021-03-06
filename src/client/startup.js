$(document).ready(function () {
	var canvas = document.createElement('canvas');
	canvas.id = 'cocos2d_gameCanvas'; // game canvas is referenced in project.json
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.body.appendChild(canvas);

	cc.game.run();
});

cc.game.onStart = function () {
	sand.allRegions = {};
	sand.batchedFootprints = [];
	$.cookie.json = true;

	var playerData = $.cookie('playerData') || {lastPosition: {x: 5750, y: 610}};
	playerData.uuid = sand.uuid;

	$.cookie('playerData', playerData, {expires: 7});
	sand.globalCoordinates = playerData.lastPosition;

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

		cc.view.setResolutionPolicy(cc.ResolutionPolicy.NO_BORDER);
		cc.view.resizeWithBrowserSize(true);
		cc.view.adjustViewPort(true);

		var resourceArray = [];
		for (var resource in resources) {
			if (resources.hasOwnProperty(resource)) {
				resourceArray.push(resources[resource]);
			}
		}
		cc.LoaderScene.preload(resourceArray, function () {
			cc.director.runScene(new GameScene());
		}, this);
	}
};

sand.globalFunctions = sand.globalFunctions || {};

sand.globalFunctions.addMoreRegions = function (onComplete, regionNames) {
	if (regionNames === undefined) {
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
	regionNames.forEach(function (regionName) {
		if (!sand.allRegions.hasOwnProperty(regionName)) {
			newRegionNames.push(regionName);
		}
	});

	if (newRegionNames.length === 0) {
		if (onComplete !== undefined) {
			onComplete();
		}
	} else {
		var numRegionsToDownload = newRegionNames.length;
		newRegionNames.forEach(function (regionName) {
			$.ajax({
				url: "fetch_region",
				type: "GET",
				data: {"regionName": regionName},
				success: function (regionData) {
					sand.allRegions[regionName] = new RegionNode(regionName);
					sand.allRegions[regionName].setData(regionData);

					var canvas = document.createElement('canvas');
					canvas.id = regionName;
					canvas.width = sand.constants.kCanvasWidth;
					canvas.height = (sand.constants.kCanvasWidth);
					canvas.style.display = 'none';
					sand.allRegions[regionName].setCanvas(canvas);

					var texture = new cc.Texture2D();
					texture.initWithElement(sand.allRegions[regionName].getCanvas());
					var sprite = new cc.Sprite(texture);
					sprite.setName(regionName);
					sprite.setAnchorPoint(0, 0);
					sprite.setVisible(false);
					sand.allRegions[regionName].setSprite(sprite);

					// on startup, BackgroundLayer has not yet been initialized. In that case, the sprites are
					// later added during BackgroundLayer's init function.
					if (sand.backgroundLayer !== undefined) {
						sand.backgroundLayer.addChild(sprite);
					}

					numRegionsToDownload--;
					if (numRegionsToDownload === 0) {
						onAllRegionsDownloaded();
					}
				},
				error: function (jqXHR, textStatus, errorThrown) {
					console.log("region lookup failed at: " + this.url + " with status: " + textStatus + " error: " + errorThrown);
				}
			});
		});

		function onAllRegionsDownloaded() {
			var allRegions = sand.allRegions;
			for (var regionName in allRegions) {
				if (allRegions.hasOwnProperty(regionName)) {
					allRegions[regionName].initializeAdjacentNodes();
				}
			}

			// draw new regions. note: relies on adjacent nodes being initialized
			newRegionNames.forEach(function (regionName) {
				sand.canvasUpdate.drawRegionToCanvas(allRegions[regionName]);

			});

			try {
				ga('send', 'event', 'regions', 'addMore', newRegionNames, newRegionNames.length);
			} catch (err) {
				//  Occasionally this function will throw an error when the client has blocked google analytics
			}

			if (onComplete !== undefined) {
				onComplete();
			}
		}
	}
};

sand.globalFunctions._fly = function (disable) {
	if (disable !== undefined) {
		sand.constants.kElephantSpeed = 50;
		sand.constants.kScrollSpeed = 80;
		sand.flying = false;
		return "landed."
	}
	sand.constants.kElephantSpeed *= 2;
	sand.constants.kScrollSpeed *= 2;
	sand.flying = true;
	return "current speed: " + sand.constants.kElephantSpeed + " kilophants/hour."
};

sand.globalFunctions.addFootprintToQueue = function (location, brushStrokeType, additionalData) {
	var roundedLocation = {
		x: Math.round(location.x),
		y: Math.round(location.y)
	};

	var print = {
		location: roundedLocation,
		brush: brushStrokeType
	};

	if (additionalData !== undefined) {
		print.additionalData = additionalData;
	}

	sand.batchedFootprints.push(print);

	if (!sand.reserveAreasModule.isInsideReservedArea(location)) {
		sand.socket.emit('footprint', print);
	}
};

sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates = function (globalPosition) {
	var localPosition = sand.globalFunctions.toLocalCoordinates(globalPosition);
	var currentViewport = sand.currentRegion.getSprite().getPosition();
	return {
		x: currentViewport.x + localPosition.x,
		y: currentViewport.y + localPosition.y
	};
};

sand.globalFunctions.convertOnScreenPositionToGlobalCoordinates = function (onScreenPosition) {
	var backgroundPosition = sand.currentRegion.getSprite();
	var localPosition = {
		x: onScreenPosition.x - backgroundPosition.x,
		y: onScreenPosition.y - backgroundPosition.y
	};

	return sand.globalFunctions.toGlobalCoordinates(localPosition);
};

sand.globalFunctions.mod = function (a, n) {
	return ((a % n) + n) % n;
};

sand.globalFunctions.getApproximateDistance = function (point1, point2) {
	return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
};

sand.globalFunctions.moveTextBoxNearPosition = function (textBox, position) {
	var newPosition = {x: position.x, y: position.y};
	newPosition.y = window.innerHeight - newPosition.y; // cocos2d y coordinates are inverted relative to HTML coordinates

	newPosition.x += sand.constants.kSpeechBoxOffset.x;
	newPosition.y += sand.constants.kSpeechBoxOffset.y - textBox.height();

	if (textBox.width() + newPosition.x > window.innerWidth) {
		newPosition.x = window.innerWidth - textBox.width();
	} else if (newPosition.x < 0) {
		newPosition.x = 0;
	}

	if (textBox.height() + newPosition.y > window.innerHeight) {
		newPosition.y = window.innerHeight - textBox.height();
	} else if (newPosition.y < 0) {
		newPosition.y = 0;
	}

	textBox.css({
		left: newPosition.x,
		top: newPosition.y
	});
};