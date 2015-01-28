var sand = sand || {};
sand.constants = {
	kCanvasWidth: 512, // width of draw canvases
	kRegionWidth: 256, // number of sand grains in a single row of desert
	kZipCodeWidth: 4,
	kLoadMoreRegionsThreshold: 400, // distance beyond edge of viewport to start loading more regions
	kAffectedRegionWidth: 120,
	kElephantSpeed: 50,
	kScrollSpeed: 80,
	kBeginScrollThreshold: 150, // distance from edge to start scrolling toward player
	kFootprintVerticalOffset: 12, // vertical distance from center of elephant sprite to place footprints
	kElephantHeightOffset: 30 // vertical distance from bottom of elephant to display inventory items
};

var module = module || {};
module.exports = sand.constants;
