function setupDrawRegions(sandLayer) {
	$.get("fetch_region", function( data ) {
		sandGlobals.level.grid = JSON.parse(data);
		var levelRenderer = sandGlobals.levelRenderer;

		sandGlobals.canvases = {
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

		sandGlobals.canvasWidth = sandGlobals.canvases.cocos_gameCanvas.width();

		sandGlobals.canvases.drawAllCanvases();
	});
}