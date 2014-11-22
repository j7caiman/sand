var sand = {
	player: {},
	currentRegion: {},
	allRegions: {},
	level: {},
	htmlCanvases: {},
	constants: {
		kCanvasWidth: 512,
		kViewportWidth: 384,
		kLoadMoreRegionsThreshold: 500,
		kPlayerSpeed: 25,
		kScrollSpeed: 100
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
		this.addChild(new BackgroundLayer());
		this.addChild(playerLayer);

		sand.globalFunctions.updateHtmlCanvases();
	}
});

sand.level.update = function() {
	/**
	 * An aggregate of:
	 * The sprite texture's coordinates relative to the level region's coordinates.
	 * And the player's position relative to the cocos2d sprite texture.
	 * Finally, the y value has a small amount shaved off to line up the footprints the the player's feet.
	 */
	var backgroundPosition = sand.currentRegion.getSprite().getPosition();
	var playerPosition = sand.player.sprite.getPosition();
	var positionOnRegion = {
		x: (sand.constants.kCanvasWidth / 2) + (playerPosition.x - backgroundPosition.x),
		y: (sand.constants.kCanvasWidth / 2) + (playerPosition.y - backgroundPosition.y - sand.player.sprite.width / 4)
	};

	var globalPosition = {
		x: positionOnRegion.x + (sand.currentRegion.x * sand.constants.kCanvasWidth),
		y: positionOnRegion.y + (sand.currentRegion.y * sand.constants.kCanvasWidth)
	};

	sand.player.globalCoordinates = globalPosition;
	var newRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(globalPosition);
	if (!(sand.currentRegion.name == newRegionName)) {
		sand.currentRegion = sand.allRegions[newRegionName];
	}

	var regionData = sand.currentRegion.getData();
	sand.level.imprintSphere(regionData, positionOnRegion, 3);
	sand.level.settle(regionData);
	sand.level.savePlayerAndLevel(globalPosition, sand.currentRegion);

	sand.globalFunctions.updateHtmlCanvases();
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


sand.globalFunctions = {
	addMoreRegions: function addMoreRegions(callback) {
		var allRegions = sand.allRegions;

		var regionNamesInViewport = sand.globalFunctions.findRegionsInViewport();

		var newRegionNames = [];
		for (var i = 0; i < regionNamesInViewport.length; i++) {
			var regionName = regionNamesInViewport[i];
			if (!allRegions.hasOwnProperty(regionName)) {
				allRegions[regionName] = new RegionNode(regionName, allRegions);
				newRegionNames.push(regionName);
			}
		}

		if(newRegionNames.length != 0) {
			for (regionName in allRegions) {
				if (allRegions.hasOwnProperty(regionName)) {
					allRegions[regionName].initializeAdjacentNodes();
				}
			}
		}

		$.ajax({
			url: "fetch_region",
			type: "POST",
			data: JSON.stringify(newRegionNames),
			contentType: "application/json",
			success: function (responseData) {
				var allRegions = sand.allRegions;
				var newRegions = responseData.regions;
				for (var regionName in newRegions) {
					if (newRegions.hasOwnProperty(regionName)) {
						allRegions[regionName].setData(newRegions[regionName]);
						allRegions[regionName].setCanvas(sand.globalFunctions.createCanvas(regionName, sand.constants.kCanvasWidth));
					}
				}

				if(callback !== undefined) {
					callback();
				}
			}
		});
	},

	createCanvas: function(id, span) {
		var canvas = document.createElement('canvas');
		canvas.id = id;
		canvas.width = span;
		canvas.height = span;
		document.body.appendChild(canvas);
		return canvas;
	},

	findRegionNameFromAbsolutePosition: function(position) {
		var xCoordinate = Math.floor(position.x / sand.constants.kCanvasWidth);
		var yCoordinate = Math.floor(position.y / sand.constants.kCanvasWidth);
		return xCoordinate + "_" + yCoordinate;
	},

	findRegionsInViewport: function() {
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
			if(regionNames.indexOf(item) == -1) {
				regionNames.push(item);
			}
		}

		return regionNames;
	},

	updateHtmlCanvases: function () {
		function drawAsDepthGrid(canvas, data) {
			sand.globalFunctions.canvasDrawHelper.call(
				canvas,
				function(blockIndex, grid) {
					var allRegions = sand.allRegions;
					for (var regionName in allRegions) {
						if(allRegions.hasOwnProperty(regionName)) {
							if (allRegions[regionName].name == canvas.id) {
								var color = 180 + (grid[blockIndex.y][blockIndex.x] * 20);
								return {
									red: color + allRegions[regionName].x * 20,
									green: color,
									blue: color + allRegions[regionName].y * 20
								};
							}
						}
					}
				},
				data);
		}

		var allRegions = sand.allRegions;
		for (var regionName in allRegions) {
			if(allRegions.hasOwnProperty(regionName)) {
				drawAsDepthGrid(allRegions[regionName].getCanvas(), allRegions[regionName].getData());
			}
		}
	},

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
					data[index    ] = color.red; // red
					data[index + 1] = color.green; // green
					data[index + 2] = color.blue; // blue
					data[index + 3] = 255;   // alpha
				}
				index += 4;
			}
		}

		context.putImageData(imageData, 0, 0);
	}
};

var RegionNode = function (name, allRegions) {
	var coordinates = name.split("_");
	this.x = Number(coordinates[0]);
	this.y = Number(coordinates[1]);
	this.name = name;

	this._allRegions = allRegions;
};

RegionNode.prototype = {
	constructor: RegionNode,

	initializeAdjacentNodes: function () {
		var adjacentNodes = [];
		adjacentNodes[0] = this._allRegions[(this.x + 1) + "_" + (this.y + 1)];	// northeast
		adjacentNodes[1] = this._allRegions[(this.x + 0) + "_" + (this.y + 1)];	// north
		adjacentNodes[2] = this._allRegions[(this.x - 1) + "_" + (this.y + 1)];	// northwest
		adjacentNodes[3] = this._allRegions[(this.x - 1) + "_" + (this.y + 0)];	// west
		adjacentNodes[4] = this._allRegions[(this.x - 1) + "_" + (this.y - 1)];	// southwest
		adjacentNodes[5] = this._allRegions[(this.x + 0) + "_" + (this.y - 1)];	// south
		adjacentNodes[6] = this._allRegions[(this.x + 1) + "_" + (this.y - 1)];	// southeast
		adjacentNodes[7] = this._allRegions[(this.x + 1) + "_" + (this.y + 0)];	// east

		this._adjacentNodes = adjacentNodes;
	},

	getData: function () {
		return this._data;
	},
	setData: function (data) {
		this._data = data;
	},
	getCanvas: function () {
		return this._canvas;
	},
	setCanvas: function (canvas) {
		this._canvas = canvas;
	},
	getSprite: function () {
		return this._sprite;
	},
	setSprite: function (sprite) {
		this._sprite = sprite;
	},
	getAdjacentNodes: function () {
		return this._adjacentNodes;
	}
};