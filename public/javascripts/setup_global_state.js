var sandGlobals = {
	imprints : {},
	level : {}
};

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

	sandGlobals.imprints.sphere(locationOnGrid, 7, this.grid);

	sandGlobals.level.settle();
};