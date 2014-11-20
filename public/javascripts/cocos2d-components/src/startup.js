var sand = {
	player: {},
	level: {},
	canvases: {},
	constants: {
		kCanvasWidth: 512,
		kPlayerSpeed: 25
	}
};

$(document).ready(function() {
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
	sand.player.locationOnCanvas = lastPosition;

	$.ajax({
		url: "fetch_region",
		type: "POST",
		data: JSON.stringify([{x: 0, y: 0}]),
		contentType: "application/json",
		success: function (data) {
			sand.level.grid = data.regions[0].regionData;
			sand.canvases.html.depthGrid.canvas = $('#sand_grid_region');
			sand.canvases.html.withLighting.canvas = $('#lit_sand_grid_region');

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
		this.addChild(sandLayer);
		this.addChild(new PlayerMovementLayer());

		sand.canvases.cocos2d = {
			canvas: $('#cocos2d_gameCanvas'),
			draw: function (canvasToRead) {
				sandLayer.canvasTextureToDrawFrom.initWithElement(canvasToRead);
				sandLayer.canvasTextureToDrawFrom.handleLoadedTexture();
			}
		};

		sand.canvases.drawAllCanvases();
	}
});

sand.level.update = function(relativePositionOnCanvas) {
	var blockWidth = sand.constants.kCanvasWidth / this.grid[0].length; // blocks are square
	var locationOnGrid = {
		"x": Math.floor(relativePositionOnCanvas.x / blockWidth),
		"y": Math.floor(relativePositionOnCanvas.y / blockWidth)};

	sand.level.imprintSphere(locationOnGrid, 3);

	sand.level.settle();
	sand.level.postToServer();
	$.cookie('lastPosition', relativePositionOnCanvas, { expires: 7 });

	sand.canvases.drawAllCanvases();
};

sand.level.postToServer = function() {
	sand.level.postToServer.counter++;
	if (sand.level.postToServer.counter < 5) {
		return;
	}
	sand.level.postToServer.counter = 0;

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
sand.level.postToServer.counter = 4;

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
				var index = (y * canvasWidth + x) * 4; //imageData.data contains four elephants per pixel
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
				this.canvas[0],
				function(blockIndex, grid) {
					return 180 + (grid[blockIndex.y][blockIndex.x] * 20);
				},
				sand.level.grid);
		}
	},

	withLighting: {
		draw: function () {
			sand.canvases.html.canvasDrawHelper.call(
				this.canvas[0],
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

	sand.canvases.cocos2d.draw(sand.canvases.html.depthGrid.canvas[0]);
};
