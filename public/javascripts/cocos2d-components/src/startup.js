var sand = {
	player: {},
	backgroundLayer: {},
	currentRegion: {},
	allRegions: {},
	level: {},
	htmlCanvases: {},
	constants: {
		kCanvasWidth: 512,
		kRegionWidth: 256,
		kViewportWidth: 384,
		kLoadMoreRegionsThreshold: 500,
		kPlayerSpeed: 25,
		kScrollSpeed: 100,
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

		sand.level.updateHtmlCanvases();
	}
});

sand.globalFunctions = {
	update: function() {
		var backgroundPosition = { // bottom left corner of center background sprite
			x: sand.currentRegion.getSprite().x - sand.constants.kCanvasWidth / 2,
			y: sand.currentRegion.getSprite().y - sand.constants.kCanvasWidth / 2
		};
		var playerPosition = { // player sprite position
			x: sand.player.sprite.x,
			y: sand.player.sprite.y - sand.player.sprite.width / 4 // slightly offset footprints from player
		};

		var positionOnCanvas = {
			x: playerPosition.x - backgroundPosition.x,
			y: playerPosition.y - backgroundPosition.y
		};

		var globalPosition = {
			x: positionOnCanvas.x + (sand.currentRegion.x * sand.constants.kCanvasWidth),
			y: positionOnCanvas.y + (sand.currentRegion.y * sand.constants.kCanvasWidth)
		};

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
				x: sand.currentRegion.getSprite().x - differenceInLocation.x,
				y: sand.currentRegion.getSprite().y - differenceInLocation.y
			};

			var newRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(globalPosition);
			sand.currentRegion = sand.allRegions[newRegionName];
			sand.backgroundLayer.initializeSpriteLocations(newBackgroundPosition);
		}

		sand.player.globalCoordinates = globalPosition;

		var regionData = sand.currentRegion.getData();
		sand.level.makeFootprint(regionData, positionOnCanvas);
		sand.level.settle(regionData);
		sand.level.updateHtmlCanvases();
		sand.level.savePlayerAndLevel(globalPosition, sand.currentRegion);

		sand.globalFunctions.addMoreRegions(function() {
			sand.backgroundLayer.initializeSpriteLocations(sand.currentRegion.getSprite().getPosition());
		});
	},

	addMoreRegions: function (callback) {
		var allRegions = sand.allRegions;

		var visibleRegions = sand.globalFunctions.findRegionsInViewport();

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

							var sprite = new cc.Sprite(new cc.Texture2D());
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

	findRegionsInViewport: function () {
		/**
		 * camera view port. Centered around the player on startup.
		 *
		 * 0,1|1,1
		 * ---+---
		 * 0,0|1,0
		 */
		var viewPort = [
			{
				x: sand.player.globalCoordinates.x + (sand.constants.kLoadMoreRegionsThreshold / 2),
				y: sand.player.globalCoordinates.y + (sand.constants.kLoadMoreRegionsThreshold / 2)
			},
			{
				x: sand.player.globalCoordinates.x - (sand.constants.kLoadMoreRegionsThreshold / 2),
				y: sand.player.globalCoordinates.y + (sand.constants.kLoadMoreRegionsThreshold / 2)
			},
			{
				x: sand.player.globalCoordinates.x - (sand.constants.kLoadMoreRegionsThreshold / 2),
				y: sand.player.globalCoordinates.y - (sand.constants.kLoadMoreRegionsThreshold / 2)
			},
			{
				x: sand.player.globalCoordinates.x + (sand.constants.kLoadMoreRegionsThreshold / 2),
				y: sand.player.globalCoordinates.y - (sand.constants.kLoadMoreRegionsThreshold / 2)
			}
		];

		var regionNames = [];
		for (var i = 0; i < viewPort.length; i++) {
			var item = sand.globalFunctions.findRegionNameFromAbsolutePosition(viewPort[i]);
			if (regionNames.indexOf(item) == -1) {
				regionNames.push(item);
			}
		}

		return regionNames;
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

sand.level.updateHtmlCanvases = function () {
	function drawAsDepthGrid(canvas, data) {
		sand.level.canvasDrawHelper.call(
			canvas,
			function(blockIndex, grid) {
				var color = 180 + (grid[blockIndex.y][blockIndex.x] * 20);
				return {
					red: color + allRegions[canvas.id].x * 20,
					green: color,
					blue: color + allRegions[canvas.id].y * 20
				};
			},
			data);
	}

	var visibleRegions = sand.globalFunctions.findRegionsInViewport();
	var allRegions = sand.allRegions;
	for (var i = 0; i < visibleRegions.length; i++) {
		var regionName = visibleRegions[i];
		if (allRegions.hasOwnProperty(regionName)) {
			drawAsDepthGrid(allRegions[regionName].getCanvas(), allRegions[regionName].getData());
		}
	}
	};

sand.level.canvasDrawHelper = function (choosePixelColorFunction, grid) {
	var regionWidth = grid[0].length;

	var canvasWidth = this.width;
	var canvasHeight = this.height;

	var blockWidth = canvasWidth / regionWidth; // blocks are square

	var context = this.getContext('2d');
	//var imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
	var imageData = context.createImageData(canvasWidth, canvasHeight);
	var data = imageData.data;

	for (var y = 0; y < canvasHeight; y++) {
		for (var x = 0; x < canvasWidth; x++) {
			/**
			 * imageData.data contains four elephants per pixel, hence index is multiplied by 4
			 * html canvas y coordinates are opposite cocos2d, hence (canvasHeight-1) - y
			 */
			var index = (((canvasHeight-1) - y) * canvasWidth + x) * 4;
			var blockIndex = {"x": Math.floor(x / blockWidth), "y": Math.floor(y / blockWidth)};

			var color = choosePixelColorFunction(blockIndex, grid);
			if(color != null) {
				data[index    ] = color.red; // red
				data[index + 1] = color.green; // green
				data[index + 2] = color.blue; // blue
				data[index + 3] = 255;   // alpha
			}
			index += 4;
		}
	}

	context.putImageData(imageData, 0, 0);
};