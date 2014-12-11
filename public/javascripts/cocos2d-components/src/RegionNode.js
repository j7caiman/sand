var RegionNode = function (name) {
	var coordinates = name.split("_");
	this.x = Number(coordinates[0]);
	this.y = Number(coordinates[1]);
	this._name = name;
};

RegionNode.prototype = {
	constructor: RegionNode,

	initializeAdjacentNodes: function () {
		var adjacentNodes = [];
		adjacentNodes[0] = sand.allRegions[(this.x + 1) + "_" + (this.y + 1)];	// northeast
		adjacentNodes[1] = sand.allRegions[(this.x + 0) + "_" + (this.y + 1)];	// north
		adjacentNodes[2] = sand.allRegions[(this.x - 1) + "_" + (this.y + 1)];	// northwest
		adjacentNodes[3] = sand.allRegions[(this.x - 1) + "_" + (this.y + 0)];	// west
		adjacentNodes[4] = sand.allRegions[(this.x - 1) + "_" + (this.y - 1)];	// southwest
		adjacentNodes[5] = sand.allRegions[(this.x + 0) + "_" + (this.y - 1)];	// south
		adjacentNodes[6] = sand.allRegions[(this.x + 1) + "_" + (this.y - 1)];	// southeast
		adjacentNodes[7] = sand.allRegions[(this.x + 1) + "_" + (this.y + 0)];	// east

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
	},

	getName: function () {
		return this._name;
	}
};