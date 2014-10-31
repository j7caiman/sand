var sandGlobals = {
	imprints : {},
	level : {}
};

$(document).ready(function() {
	$.get("fetch_region", function( data ) {
		sandGlobals.level.grid = JSON.parse(data);
		var levelRenderer = sandGlobals.levelRenderer;

		var canvases = {
			canvas_as_depth_grid : $('#sand_grid_region'),
			canvas_with_lighting : $('#lit_sand_grid_region'),
			drawAllCanvases : function() {
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
		}(canvases.canvas_as_depth_grid));

	});
});

sandGlobals.level.postToServer = function() {
	$.ajax({
		url: "write_to_region",
		type: "POST",
		data: JSON.stringify(this.grid),
		contentType: "application/json"
	});
};

sandGlobals.level.update = function(relativePositionOnCanvas, canvas) {
	var blockWidth = canvas.width / this.grid[0].length; // blocks are square
	var locationOnGrid = {
		"x": Math.floor(relativePositionOnCanvas.x / blockWidth),
		"y": Math.floor(relativePositionOnCanvas.y / blockWidth)};

//	createSquareFootprint(locationOnGrid, this.grid);
//	createCircularFootprint(locationOnGrid, 4, this.grid);
	sandGlobals.imprints.sphere(locationOnGrid, 7, this.grid);

	sandGlobals.level.settle();
};