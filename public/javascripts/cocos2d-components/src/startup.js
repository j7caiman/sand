var sand = {
	elephantLayer: {},
	backgroundLayer: {},
	currentRegion: {},
	allRegions: {},
	globalCoordinates: {},

	constants: {
		kCanvasWidth: 512, // width of draw canvases
		kRegionWidth: 256, // number of sand grains in a single row of desert
		kViewportWidth: window.innerWidth, // width of cocos2d canvas and viewport dimensions
		kViewportHeight: window.innerHeight,
		kLoadMoreRegionsThreshold: Math.max(window.innerWidth, window.innerHeight), // distance from player to load more regions
		kAffectedRegionWidth: 120,
		kPlayerSpeed: 25,
		kScrollSpeed: 50,
		kBeginScrollThreshold: 150 // distance from edge to start scrolling toward player
	}
};

$(document).ready(function() {
	sand.globalFunctions.createCanvas(
		'cocos2d_gameCanvas', // game canvas is referenced in project.json
		sand.constants.kViewportWidth,
		sand.constants.kViewportHeight
	);
	cc.game.run();
});

cc.game.onStart = function() {
	$(window).resize(function() {
		// width of cocos2d canvas and viewport dimensions
		sand.constants.kViewportWidth = window.innerWidth;
		sand.constants.kViewportHeight = window.innerHeight;
		sand.constants.kLoadMoreRegionsThreshold = 400 + Math.max(window.innerWidth, window.innerHeight);
	});

	sand.globalCoordinates = (function() {
		$.cookie.json = true;
		var lastPositionFromCookie = $.cookie('lastPosition');
		var lastPosition;
		if (lastPositionFromCookie !== undefined) {
			lastPosition = lastPositionFromCookie;
		} else {
			lastPosition = {
				x: 100,
				y: 100
			};
			$.cookie('lastPosition', lastPosition, {expires: 7});
		}
		return lastPosition;
	})();

	sand.globalFunctions.addMoreRegions(loadAndRunGameScene);

	var currentRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(sand.globalCoordinates);
	sand.currentRegion = sand.allRegions[currentRegionName];

	cc.screen.requestFullScreen();
	cc.view.setResolutionPolicy(cc.ResolutionPolicy.NO_BORDER);
	cc.view.resizeWithBrowserSize(true);
	cc.view.adjustViewPort(true);

	function loadAndRunGameScene() {
		cc.LoaderScene.preload(g_resources, function () {
			cc.director.runScene(new GameScene());
		}, this);
	}
};

sand.globalFunctions = {
	updateRegionsAndDrawCanvases: function() {
		var changedArea = {
			x: sand.globalCoordinates.x - sand.constants.kAffectedRegionWidth / 2,
			y: sand.globalCoordinates.y - sand.constants.kAffectedRegionWidth / 2,
			width: sand.constants.kAffectedRegionWidth,
			height: (sand.constants.kAffectedRegionWidth)
		};
		sand.modifyRegion.makeFootprint(changedArea, sand.globalCoordinates);
		sand.modifyRegion.settle();

		sand.canvasUpdate.updateHtmlCanvases(changedArea);
	},

	addMoreRegions: function (callback) {
		var allRegions = sand.allRegions;

		var preloadThresholdRect = {
			x: sand.globalCoordinates.x - (sand.constants.kLoadMoreRegionsThreshold / 2),
			y: sand.globalCoordinates.y - (sand.constants.kLoadMoreRegionsThreshold / 2),
			width: sand.constants.kLoadMoreRegionsThreshold,
			height: sand.constants.kLoadMoreRegionsThreshold
		};
		var visibleRegions = sand.globalFunctions.findRegionsInRect(preloadThresholdRect);

		var newRegionNames = [];
		for (var i = 0; i < visibleRegions.length; i++) {
			var regionName = visibleRegions[i];
			if (!allRegions.hasOwnProperty(regionName)) {
				allRegions[regionName] = new RegionNode(regionName);
				newRegionNames.push(regionName);
			}
		}

		if (newRegionNames.length != 0) {
			for (regionName in allRegions) {
				if (allRegions.hasOwnProperty(regionName)) {
					allRegions[regionName].initializeAdjacentNodes();
				}
			}

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
							allRegions[regionName].setData(dataForNewRegions[regionName]);
							allRegions[regionName].setCanvas(sand.globalFunctions.createCanvas(regionName, sand.constants.kCanvasWidth));
							allRegions[regionName].getCanvas().style.display = 'none';
							sand.canvasUpdate.drawRegionToCanvas(allRegions[regionName]);

							var sprite = new cc.Sprite(new cc.Texture2D());
							sprite.setName(regionName);
							sprite.setAnchorPoint(0, 0);
							allRegions[regionName].setSprite(sprite);
						}
					}

					if (callback !== undefined) {
						callback();
					}
				}
			});
		}
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
		for (x = 0; x < xCoordinates.length; x++) {
			for (y = 0; y < yCoordinates.length; y++) {
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

	toLocalCoordinates: function(point, region) {
		if(region === undefined) { // region is an optional parameter
			region = sand.currentRegion;
		}
		return {
			x: point.x - (region.x * sand.constants.kCanvasWidth),
			y: point.y - (region.y * sand.constants.kCanvasWidth)
		}
	},

	toGlobalCoordinates: function(point) {
		return {
			x: point.x + (sand.currentRegion.x * sand.constants.kCanvasWidth),
			y: point.y + (sand.currentRegion.y * sand.constants.kCanvasWidth)
		}
	}
};
