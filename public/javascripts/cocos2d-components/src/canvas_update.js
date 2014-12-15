sand.canvasUpdate = {
	/**
	 * note: rectToDraw is in global coordinates
	 */
	updateHtmlCanvases: function (rectToDraw) {
		var regionNames = sand.globalFunctions.findRegionsInRect(rectToDraw);
		regionNames.forEach(function (regionName) {
			var region = sand.allRegions[regionName];
			// region not guaranteed to be loaded, since the rectangle may reference an area beyond the player
			if (region !== undefined) {
				var rectLocal = sand.globalFunctions.toLocalCoordinates({x: rectToDraw.x, y: rectToDraw.y}, region);
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

				sand.canvasUpdate.drawRegionToCanvas(region, intersectRect);
			}
		});
	},

	drawRegionToCanvas: function (region, rectToDraw) {
		sand.canvasUpdate.canvasDrawHelper(region, rectToDraw, sand.canvasUpdate.compositeDraw);
	},

	depthGridGradientDraw: function (blockIndex, region) {
		var baseColor = 150;

		function makeColorBlocky(color) {
			var base = Math.floor(color / 16) * 16;
			base += (color % 2 == 0) ? 20 : 0;
			return base;
		}

		return {
			red: 120 + (region.x * 20) + makeColorBlocky(blockIndex.x / 2),
			green: baseColor,
			blue: 100 + (region.y * 20) + makeColorBlocky(blockIndex.y)
		};
	},

	localDepthDeltaLightingDraw: function (blockIndex, region) {
		var difference = findDepthDifferenceOfBlockToTheLeft(blockIndex, region);

		if (difference >= 2) {
			const dark = 80;
			return {
				red: dark,
				green: dark,
				blue: dark
			}
		} else if (difference >= 1) {
			const medium = 150;
			return {
				red: medium,
				green: medium,
				blue: medium
			}
		} else if (difference >= 0) {
			const light = 210;
			return {
				red: light,
				green: light,
				blue: light
			}
		} else {
			const bright = 230;
			return {
				red: bright,
				green: bright,
				blue: bright
			}
		}

		function findDepthDifferenceOfBlockToTheLeft(blockIndex, region) {
			var data = region.getData();
			var depthOfCurrentBlock = data[blockIndex.y][blockIndex.x];
			var depthOfLeftBlock;
			if (blockIndex.x == 0) {
				var westRegion = region.getAdjacentNodes()[3];
				if (westRegion !== undefined && westRegion.getData() !== undefined) {
					depthOfLeftBlock = westRegion.getData()[sand.constants.kRegionWidth - 1][blockIndex.x - 1];
				} else {
					depthOfLeftBlock = 0;
				}
			} else {
				depthOfLeftBlock = data[blockIndex.y][blockIndex.x - 1];
			}
			return depthOfLeftBlock - depthOfCurrentBlock;
		}
	},

	compositeDraw: function (region, rectToDraw) {
		var firstColor = sand.canvasUpdate.localDepthDeltaLightingDraw(region, rectToDraw);
		var secondColor = sand.canvasUpdate.depthGridGradientDraw(region, rectToDraw);

		return {
			red: Math.floor((firstColor.red + secondColor.red) / 2),
			green: Math.floor((firstColor.green + secondColor.green) / 2),
			blue: Math.floor((firstColor.blue + secondColor.blue) / 2)
		}
	},

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
	canvasDrawHelper: function (region, drawRect, choosePixelColorFunction) {
		if (drawRect === undefined) {
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

		var context = region.getCanvas().getContext('2d');
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

				var aColor = choosePixelColorFunction(regionIndex, region);
				if (aColor != null) {
					data[imageDataIndex] = aColor.red;
					data[imageDataIndex + 1] = aColor.green;
					data[imageDataIndex + 2] = aColor.blue;
					data[imageDataIndex + 3] = 255;
				}
			}
		}

		context.putImageData(imageData, drawRect.x, drawRect.invertedY);
	}
};