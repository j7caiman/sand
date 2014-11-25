var sand = {
	player: {},
	backgroundLayer: {},
	currentRegion: {},
	allRegions: {},
	level: {},
	htmlCanvases: {},
	constants: {
		kCanvasWidth: 512, // width of draw canvases
		kRegionWidth: 256, // number of sand grains in a single row of desert
		kViewportWidth: 450, // width of cocos2d canvas and viewport dimensions
		kLoadMoreRegionsThreshold: 500, // distance from player to load more regions
		kAffectedRegionWidth: 40,
		kPlayerSpeed: 25,
		kScrollSpeed: 50,
		kBeginScrollThreshold: 90, // distance from edge to start scrolling toward player
		kFootprintRadius: 3
	}
};

$(document).ready(function() {
	sand.globalFunctions.createCanvas('cocos2d_gameCanvas', sand.constants.kViewportWidth); // game canvas is referenced in project.json
	cc.game.run();
});

cc.game.onStart = function() {
	sand.player.globalCoordinates = (function() {
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

	var currentRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(sand.player.globalCoordinates);
	sand.currentRegion = sand.allRegions[currentRegionName];

	cc.view.adjustViewPort(true);
	//load resources
	function loadAndRunGameScene() {
		cc.LoaderScene.preload(g_resources, function () {
			cc.director.runScene(new GameScene());
		}, this);
	}
};

var GameScene = cc.Scene.extend({
	onEnter:function () {
		this._super();

		var playerLayer = new PlayerLayer();
		sand.player.sprite = playerLayer.player;
		var backgroundLayer = new BackgroundLayer();
		sand.backgroundLayer = backgroundLayer;
		this.addChild(backgroundLayer);
		this.addChild(playerLayer);
	}
});

sand.globalFunctions = {
	update: function() {
		var backgroundPosition = sand.currentRegion.getSprite();
		var playerPosition = { // player sprite position
			x: sand.player.sprite.x,
			y: sand.player.sprite.y - sand.player.sprite.width / 4 // slightly offset footprints from player
		};

		var positionOnCanvas = {
			x: playerPosition.x - backgroundPosition.x,
			y: playerPosition.y - backgroundPosition.y
		};

		var globalPosition = sand.globalFunctions.toGlobalCoordinates(positionOnCanvas);
		sand.player.globalCoordinates = globalPosition;

		function isOutOfBounds(position) {
			return position.x > sand.constants.kCanvasWidth
				|| position.y > sand.constants.kCanvasWidth
				|| position.x < 0
				|| position.y < 0;
		}
		if(isOutOfBounds(positionOnCanvas)) {
			function mod(n, mod) { return ((mod % n) + n) % n; }
			var differenceInLocation = {
				x: mod(sand.constants.kCanvasWidth, positionOnCanvas.x) - positionOnCanvas.x,
				y: mod(sand.constants.kCanvasWidth, positionOnCanvas.y) - positionOnCanvas.y
			};

			var newBackgroundPosition = {
				x: backgroundPosition.x - differenceInLocation.x,
				y: backgroundPosition.y - differenceInLocation.y
			};

			var newRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(globalPosition);
			sand.currentRegion = sand.allRegions[newRegionName];
			sand.backgroundLayer.initializeSpriteLocations(newBackgroundPosition);
		}

		var regionData = sand.currentRegion.getData();
		sand.level.makeFootprint(regionData, positionOnCanvas);
		sand.level.settle(regionData);

		var changedArea = {
			x: globalPosition.x - sand.constants.kAffectedRegionWidth / 2,
			y: globalPosition.y - sand.constants.kAffectedRegionWidth / 2,
			width: sand.constants.kAffectedRegionWidth,
			height: (sand.constants.kAffectedRegionWidth)
		};
		sand.level.updateHtmlCanvases(changedArea);
		sand.level.savePlayerAndLevel(globalPosition, sand.currentRegion);

		sand.globalFunctions.addMoreRegions(function() {
			sand.backgroundLayer.initializeSpriteLocations(sand.currentRegion.getSprite().getPosition());
		});
	},

	addMoreRegions: function (callback) {
		var allRegions = sand.allRegions;

		var preloadThresholdRect = {
			x: sand.player.globalCoordinates.x - (sand.constants.kLoadMoreRegionsThreshold / 2),
			y: sand.player.globalCoordinates.y - (sand.constants.kLoadMoreRegionsThreshold / 2),
			width: sand.constants.kLoadMoreRegionsThreshold,
			height: sand.constants.kLoadMoreRegionsThreshold
		};
		var visibleRegions = sand.globalFunctions.findRegionsInRect(preloadThresholdRect);

		var newRegionNames = [];
		for (var i = 0; i < visibleRegions.length; i++) {
			var regionName = visibleRegions[i];
			if (!allRegions.hasOwnProperty(regionName)) {
				allRegions[regionName] = new RegionNode(regionName, allRegions);
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
							sand.level.drawAsDepthGrid(allRegions[regionName]);

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

	createCanvas: function (id, span) {
		var canvas = document.createElement('canvas');
		canvas.id = id;
		canvas.width = span;
		canvas.height = span;
		document.body.appendChild(canvas);
		return canvas;
	},

	findRegionNameFromAbsolutePosition: function (position) {
		var xCoordinate = Math.floor(position.x / sand.constants.kCanvasWidth);
		var yCoordinate = Math.floor(position.y / sand.constants.kCanvasWidth);
		return xCoordinate + "_" + yCoordinate;
	},

	findRegionsInRect: function (rect) {
		var coordinates = [
			{	x: rect.x + rect.width,
				y: rect.y + rect.height
			},
			{	x: rect.x,
				y: rect.y + rect.height
			},
			{	x: rect.x,
				y: rect.y
			},
			{	x: rect.x + rect.width,
				y: rect.y
			}
		];
		
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

sand.level.savePlayerAndLevel = function(globalPosition, region) {
	sand.level.savePlayerAndLevel.counter = ++sand.level.savePlayerAndLevel.counter || 4;
	if (sand.level.savePlayerAndLevel.counter < 5) {
		return;
	}
	sand.level.savePlayerAndLevel.counter = 0;

	$.cookie('lastPosition', globalPosition, { expires: 7 });

	var data = {
		regionData: region.getData(),
		regionCoordinates: {
			x: region.x,
			y: region.y
		}
	};

	$.ajax({
		url: "write_to_region",
		type: "POST",
		data: JSON.stringify(data),
		contentType: "application/json"
	});
};

/**
 * note: rectToDraw is in global coordinates
 */
sand.level.updateHtmlCanvases = function (rectToDraw) {
	var regionNames = sand.globalFunctions.findRegionsInRect(rectToDraw);
	for (var i = 0; i < regionNames.length; i++) {
		var region = sand.allRegions[regionNames[i]];
		var rectLocal = sand.globalFunctions.toLocalCoordinates({ x: rectToDraw.x, y: rectToDraw.y }, region);
		rectLocal.width = rectToDraw.width;
		rectLocal.height = rectToDraw.height;

		var regionLocal = {
			x: 0,
			y: 0,
			width: sand.constants.kCanvasWidth,
			height: (sand.constants.kCanvasWidth)
		};

		var intersectRect = (function computeIntersectRect(r1, r2) {
			var bottomLeft = {
				x: r1.x > r2.x ? r1.x : r2.x,
				y: r1.y > r2.y ? r1.y : r2.y
			};

			var topRight = {
				x: (r1.x + r1.width) < (r2.x + r2.width) ? (r1.x + r1.width) : (r2.x + r2.width),
				y: (r1.y + r1.height) < (r2.y + r2.height) ? (r1.y + r1.height) : (r2.y + r2.height)
			};

			return {
				x: Math.floor(bottomLeft.x),
				y: Math.floor(bottomLeft.y),
				width: Math.ceil(topRight.x - bottomLeft.x),
				height: Math.ceil(topRight.y - bottomLeft.y)
			}
		})(regionLocal, rectLocal);

		sand.level.drawAsDepthGrid(region, intersectRect);
	}
};

sand.level.drawAsDepthGrid = function(region, rectToDraw) {
	var canvas = region.getCanvas();
	sand.level.canvasDrawHelper(canvas, gradientDraw, region.getData(), rectToDraw);

	function gradientDraw(blockIndex, regionData, canvas) {
		var color = 180 + (regionData[blockIndex.y][blockIndex.x] * 20);
		return {
			red: color + sand.allRegions[canvas.id].x * 20 + blockIndex.x / 2,
			green: color,
			blue: color + sand.allRegions[canvas.id].y * 20 + blockIndex.y / 2
		};
	}
};

/**
 * canvas coordinate system is opposite cocos2d's coordinate system along the y axis
 *
 * (0,0)
 *   +-----> (x,0)
 *   |
 *   |
 *   v
 * (0,y)
 *
 * therefore, the imageData is written upside down here: ((canvasWidth - 1) - y)
 * so that it is displayed right side up.
 */
sand.level.canvasDrawHelper = function (canvas, choosePixelColorFunction, regionData, drawRect) {
	if(drawRect === undefined) {
		drawRect = {
			x: 0,
			y: 0,
			width: sand.constants.kCanvasWidth,
			height: (sand.constants.kCanvasWidth)
		}
	}
	/**
	 * invert cocos2d coordinates to html coordinates.
	 * account for the width of the sprite.
	 *
	 * +---------------->
	 * |
	 * |  (0, canvasWidth - (y + sprite.height))
	 * |
	 * |  +------+
	 * |  |      |
	 * |  |      |
	 * |  +------+
	 * |  (0,y)
	 * v
	 *
	 */
	drawRect.invertedY = sand.constants.kCanvasWidth - (drawRect.y + drawRect.height);

	const canvasWidth = sand.constants.kCanvasWidth;
	var blockWidth = canvasWidth / sand.constants.kRegionWidth; // blocks are square

	var context = canvas.getContext('2d');
	var imageData = context.createImageData(drawRect.width, drawRect.height);
	var data = imageData.data;

	for (var y = 0; y < drawRect.height; y++) {
		for (var x = 0; x < drawRect.width; x++) {
			var regionIndex = {
				x: Math.floor((x + drawRect.x) / blockWidth),
				y: Math.floor((y + drawRect.y) / blockWidth)
			};

			// imageData.data contains four elephants per pixel, hence index is multiplied by 4
			var invertedY = (drawRect.height - 1) - y;
			var imageDataIndex = (invertedY * drawRect.width + x) * 4;

			var aColor = choosePixelColorFunction(regionIndex, regionData, canvas);
			if (aColor != null) {
				data[imageDataIndex] = aColor.red;
				data[imageDataIndex + 1] = aColor.green;
				data[imageDataIndex + 2] = aColor.blue;
				data[imageDataIndex + 3] = 255;
			}
		}
	}

	context.putImageData(imageData, drawRect.x, drawRect.invertedY);
};