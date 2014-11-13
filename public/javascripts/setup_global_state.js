var sandGlobals = {
	imprints: {},
	level: {},
	canvases: {},
	canvasWidth: 0
};

var counter = 0;
sandGlobals.level.postToServer = function() {
	if(counter++ < 10) {
		counter = 0;
		return;
	}

	$.ajax({
		url: "write_to_region",
		type: "POST",
		data: JSON.stringify(this.grid),
		contentType: "application/json"
	});
};

sandGlobals.level.update = function(relativePositionOnCanvas) {
	var blockWidth = sandGlobals.canvasWidth / this.grid[0].length; // blocks are square
	var locationOnGrid = {
		"x": Math.floor(relativePositionOnCanvas.x / blockWidth),
		"y": Math.floor(relativePositionOnCanvas.y / blockWidth)};

	sandGlobals.imprints.sphere(locationOnGrid, 3, this.grid);

	sandGlobals.level.settle();
	sandGlobals.level.postToServer();

	sandGlobals.canvases.drawAllCanvases();
};