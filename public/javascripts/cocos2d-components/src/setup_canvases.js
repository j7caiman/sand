function setupDrawRegions(sandLayer) {
	$.get("fetch_region", function( data ) {
		sandGlobals.level.grid = JSON.parse(data);
		var levelRenderer = sandGlobals.levelRenderer;

		var canvases = {
			cocos_gameCanvas: $('#cocos_gameCanvas'),
			canvas_as_depth_grid: $('#sand_grid_region'),
			canvas_with_lighting: $('#lit_sand_grid_region'),

			drawAllCanvases: function() {
				levelRenderer.drawWithCocos2d.call(
					sandLayer,
					this.canvas_as_depth_grid[0]);

				levelRenderer.drawGridToCanvas.call(
					this.canvas_as_depth_grid[0],
					levelRenderer.chooseColorFromDepthValue,
					sandGlobals.level.grid);

				levelRenderer.drawGridToCanvas.call(
					this.canvas_with_lighting[0],
					levelRenderer.chooseColorWithPrimitiveLighting,
					sandGlobals.level.grid);
			}
		};

		canvases.drawAllCanvases();

		(function (canvas) {
			var canvasPosition = {
				x: canvas.offset().left,
				y: canvas.offset().top
			};

			canvas.on('click', function (event) {
				var mousePosition = {
					x: event.clientX,
					y: event.clientY
				};
				var relativePositionOnCanvas = {
					x: mousePosition.x - canvasPosition.x,
					y: mousePosition.y - canvasPosition.y
				};

				sandGlobals.level.update(relativePositionOnCanvas, canvas[0]);
				sandGlobals.level.postToServer();

				canvases.drawAllCanvases();
			});
		}(canvases.cocos_gameCanvas));

	});
}