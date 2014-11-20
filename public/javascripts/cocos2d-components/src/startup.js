var sand = {
	player: {},
	level: {},
	regionsOnScreen: [],
	canvases: {
		html: {},
		cocos2d: {}
	},
	constants: {
		kCanvasWidth: 512,
		kViewportWidth: 384,
		kPlayerSpeed: 25,
		kScrollSpeed: 100
	}
};

$(document).ready(function() {
	function createCanvas(id, span) {
		var canvas = document.createElement('canvas');
		canvas.id = id;
		canvas.width = span;
		canvas.height = span;
		document.body.appendChild(canvas);
		return canvas;
	}
	sand.canvases.cocos2d.canvas = createCanvas('cocos2d_gameCanvas', sand.constants.kViewportWidth);
	sand.canvases.html.depthGrid.canvas = createCanvas('sand_grid_region', sand.constants.kCanvasWidth);
	sand.canvases.html.withLighting.canvas = createCanvas('lit_sand_grid_region', sand.constants.kCanvasWidth);

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
	sand.player.globalCoordinates = lastPosition;

	/**
	 * camera view port. Centered around the player on startup.
	 *
	 * 0,1|1,1
	 * ---+---
	 * 0,0|1,0
	 */
	function findOnScreenRegions() {
		var viewPort = [
			{
				x: sand.player.globalCoordinates.x + (sand.constants.kViewportWidth / 2),
				y: sand.player.globalCoordinates.y + (sand.constants.kViewportWidth / 2)
			},
			{
				x: sand.player.globalCoordinates.x - (sand.constants.kViewportWidth / 2),
				y: sand.player.globalCoordinates.y + (sand.constants.kViewportWidth / 2)
			},
			{
				x: sand.player.globalCoordinates.x - (sand.constants.kViewportWidth / 2),
				y: sand.player.globalCoordinates.y - (sand.constants.kViewportWidth / 2)
			},
			{
				x: sand.player.globalCoordinates.x + (sand.constants.kViewportWidth / 2),
				y: sand.player.globalCoordinates.y - (sand.constants.kViewportWidth / 2)
			}
		];

		function contains(array, item) {
			for (var j = 0; j < array.length; j++) {
				if (array[j].x == item.x && array[j].y == item.y) {
					return true;
				}
			}
			return false;
		}

		var regionCoordinates = [];
		for (var i = 0; i < viewPort.length; i++) {
			var item = (function (point) {
				return {
					x: Math.floor(point.x / sand.constants.kCanvasWidth),
					y: Math.floor(point.y / sand.constants.kCanvasWidth)
				};
			})(viewPort[i]);

			if(!contains(regionCoordinates, item)) {
				regionCoordinates.push(item);
			}
		}

		return regionCoordinates;
	}
	var onScreenRegionCoordinates = findOnScreenRegions();

	function findPlayerCurrentRegion() {
		return {
			x: Math.floor(sand.player.globalCoordinates.x / sand.constants.kCanvasWidth),
			y: Math.floor(sand.player.globalCoordinates.y / sand.constants.kCanvasWidth)
		};
	}

	function populateAdjacentRegionCoordinates(currentRegion, allRegions) {
		var adjacentRegions = [];
		for (var i = 0; i < allRegions.length; i++) {
			if (	   allRegions[i].x == currentRegion.x			// current region
					&& allRegions[i].y == currentRegion.y) {
				// do nothing
			} else if (allRegions[i].x == currentRegion.x + 1		// northeast region
					&& allRegions[i].y == currentRegion.y + 1) {
				adjacentRegions[0] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x + 0		// north region
					&& allRegions[i].y == currentRegion.y + 1) {
				adjacentRegions[1] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x - 1		// northwest region
					&& allRegions[i].y == currentRegion.y + 1) {
				adjacentRegions[2] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x - 1		// west region
					&& allRegions[i].y == currentRegion.y + 0) {
				adjacentRegions[3] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x - 1		// southwest region
					&& allRegions[i].y == currentRegion.y - 1) {
				adjacentRegions[4] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x + 0		// south region
					&& allRegions[i].y == currentRegion.y - 1) {
				adjacentRegions[5] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x + 1		// southeast region
					&& allRegions[i].y == currentRegion.y - 1) {
				adjacentRegions[6] = allRegions[i];
			} else if (allRegions[i].x == currentRegion.x + 1		// east region
					&& allRegions[i].y == currentRegion.y + 0) {
				adjacentRegions[7] = allRegions[i];
			}
		}
		return adjacentRegions;
	}

	var playerCurrentRegion = findPlayerCurrentRegion();
	var regionGraph = {
		currentRegion: playerCurrentRegion,
		adjacentRegions: populateAdjacentRegionCoordinates(playerCurrentRegion, onScreenRegionCoordinates)
	};

	$.ajax({
		url: "fetch_region",
		type: "POST",
		data: JSON.stringify(onScreenRegionCoordinates),
		contentType: "application/json",
		success: function (data) {
			sand.level.grid = data.regions[0].regionData;

			cc.game.run();
		}
	});
});

cc.game.onStart = function() {
	cc.view.adjustViewPort(true);

	//load resources
	cc.LoaderScene.preload(g_resources, function () {
		cc.director.runScene(new GameScene());
	}, this);
};

var GameScene = cc.Scene.extend({
	onEnter:function () {
		this._super();

		var sandLayer = new SandLayer();
		sand.level.visibleRegion = sandLayer.visibleRegion;
		this.addChild(sandLayer);

		var playerLayer = new PlayerLayer();
		sand.player.sprite = playerLayer.player;
		this.addChild(playerLayer);

		sand.canvases.cocos2d.draw = function (canvasToRead) {
			sandLayer.canvasTextureToDrawFrom.initWithElement(canvasToRead);
			sandLayer.canvasTextureToDrawFrom.handleLoadedTexture();
		};

		sand.canvases.drawAllCanvases();
	}
});

sand.level.update = function(positionOnRegion) {
	var blockWidth = sand.constants.kCanvasWidth / this.grid[0].length; // blocks are square
	var locationOnGrid = {
		"x": Math.floor(positionOnRegion.x / blockWidth),
		"y": Math.floor(positionOnRegion.y / blockWidth)};

	sand.level.imprintSphere(locationOnGrid, 3);

	sand.level.settle();
	sand.level.savePlayerAndLevel(positionOnRegion);

	sand.canvases.drawAllCanvases();
};

sand.level.savePlayerAndLevel = function(globalPosition) {
	sand.level.savePlayerAndLevel.counter++;
	if (sand.level.savePlayerAndLevel.counter < 5) {
		return;
	}
	sand.level.savePlayerAndLevel.counter = 0;

	$.cookie('lastPosition', globalPosition, { expires: 7 });

	var data = {
		grid: this.grid,
		regionCoordinates: {
			x: 0,
			y: 0
		}
	};

	$.ajax({
		url: "write_to_region",
		type: "POST",
		data: JSON.stringify(data),
		contentType: "application/json"
	});
};
sand.level.savePlayerAndLevel.counter = 4;

sand.canvases.html = {
	canvasDrawHelper: function (choosePixelColorFunction, grid) {
		var regionWidth = grid[0].length;

		var canvasWidth = this.width;
		var canvasHeight = this.height;

		var blockWidth = canvasWidth / regionWidth; // blocks are square

		var context = this.getContext('2d');
		var imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
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
					data[index    ] = color; // red
					data[index + 1] = color; // green
					data[index + 2] = color; // blue
					data[index + 3] = 255;   // alpha
				}
				index += 4;
			}
		}

		context.putImageData(imageData, 0, 0);
	},

	depthGrid: {
		draw: function () {
			sand.canvases.html.canvasDrawHelper.call(
				this.canvas,
				function(blockIndex, grid) {
					return 180 + (grid[blockIndex.y][blockIndex.x] * 20);
				},
				sand.level.grid);
		}
	},

	withLighting: {
		draw: function () {
			sand.canvases.html.canvasDrawHelper.call(
				this.canvas,
				function(blockIndex, grid) {
					var difference = findDepthDifferenceOfBlockToTheLeft(blockIndex, grid);
					return chooseColor(difference);

					function chooseColor(depth) {
						switch (depth) {
							case 0:
								return 255;
							case 1:
								return 230;
							case 2:
								return 153;
							case 3:
								return 0;
							default:
								return null;
						}
					}

					function findDepthDifferenceOfBlockToTheLeft(blockIndex, region) {
						var depthOfCurrentBlock = region[blockIndex.y][blockIndex.x];
						var depthOfLeftBlock = region[blockIndex.y][blockIndex.x - 1];

						return depthOfLeftBlock - depthOfCurrentBlock;
					}
				},
				sand.level.grid);
		}
	}
};

sand.canvases.drawAllCanvases = function () {
	sand.canvases.html.depthGrid.draw();
	sand.canvases.html.withLighting.draw();

	sand.canvases.cocos2d.draw(sand.canvases.html.depthGrid.canvas);
};
