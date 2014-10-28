sandGlobals.levelRenderer = {
	chooseColorFromDepthValue: function(blockIndex, grid) {
		return 180 + (grid[blockIndex.y][blockIndex.x] * 20);
	},

	chooseColorWithPrimitiveLighting: function(blockIndex, grid) {
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

	drawGridToCanvas: function (chooseColorForPixel, grid) {
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

				var color = chooseColorForPixel(blockIndex, grid);
				if(color != null) {
					updateSinglePixelOfImageData(color);
				}

				index += 4;
			}
		}

		context.putImageData(imageData, 0, 0);

		function updateSinglePixelOfImageData(color) {
			data[index    ] = color; // red
			data[index + 1] = color; // green
			data[index + 2] = color; // blue
			data[index + 3] = 255;   // alpha
		}
	}
};