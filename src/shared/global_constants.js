var sand = sand || {};
sand.constants = {
	kCanvasWidth: 512, // width of draw canvases
	kRegionWidth: 256, // number of sand grains in a single row of desert
	kSandGrainWidth: 2, // a grain of sand is 2x2 canvas pixels
	kZipCodeWidth: 4,
	kLoadMoreRegionsThreshold: 400, // distance beyond edge of viewport to start loading more regions
	kElephantSpeed: 50,
	kScrollSpeed: 80,
	kBeginScrollThreshold: 150, // distance from edge to start scrolling toward player
	kElephantHeightOffset: 22 // vertical distance from bottom of elephant to display inventory items
};

var module = module || {};
module.exports = sand.constants;
