/**
 * The canvases that render the sand are edited directly, without cocos2d,
 * by manipulating the pixels in their imageData.

 * Up to four of those canvases may be partially visible at one time, such
 * as when approaching the corner of a region.
 *
 * Each canvas's imageData is put into a Texture2D, which is then
 * rendered inside a Sprite.
 *
 * There are, however, 9 sprites that form a 3x3 grid of regions, centered
 * around the region that the player is currently on. However, only 1-4
 * are active at a given time.
 *
 * I couldn't determine an efficient way of drawing with only cocos2d calls,
 * since calling drawRect() 30,000 times was taking too long, and I couldn't can't find
 * a way to edit the pixels with cocos2d directly. I suspect drawing 30,000 Sprites would
 * also take too long.

 */
var BackgroundLayer = cc.Layer.extend({
	ctor: function () {
		this._super();
		this.init();
	},

	init: function () {
		this._super();

		this.initializeSpriteLocations();

		//set up custom listener to react to scroll commands
		cc.eventManager.addListener({
			event: cc.EventListener.CUSTOM,
			eventName: "scrollTrigger",
			callback: function(event) {
				var allRegions = sand.allRegions;
				var allSprites = [];
				for (var regionName in allRegions) {
					if(allRegions.hasOwnProperty(regionName)) {
						allSprites.push(allRegions[regionName].getSprite());
					}
				}

				allSprites.map(function(sprite) {
					sprite.stopAllActions();
				});
				sand.player.sprite.stopActionByTag("scrollPlayer");

				var centerSprite = sand.currentRegion.getSprite();
				var delta = {
					x: event.getUserData().x - centerSprite.x,
					y: event.getUserData().y - centerSprite.y
				};

				var distance = (function(point1, point2) {
					var xDelta = point2.x - point1.x;
					var yDelta = point2.y - point1.y;

					return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
				})(centerSprite, event.getUserData());
				var duration = distance / sand.constants.kScrollSpeed;

				allSprites.map(function(sprite) {
					sprite.runAction(cc.moveBy(duration, cc.p(delta.x, delta.y)));
				});

				var scrollPlayerAction = cc.moveBy(duration, cc.p(delta.x, delta.y));
				scrollPlayerAction.setTag("scrollPlayer");
				sand.player.sprite.runAction(scrollPlayerAction);
			}
		}, this);
	},

	/**
	 * Coordinates start at the center of the sprite, and the sprite is the size of the html canvas.
	 * This does the following:
	 * 	- (sand.constants.kCanvasWidth / 2) puts the bottom left of the sprite in the bottom left corner
	 * 	- (sand.constants.kViewportWidth / 2) moves the bottom left of the sprite to the middle of the viewport
	 * 	- ( -sand.player.globalCoordinates) moves the sprite back down to wherever the player is
	 */
	initializeSpriteLocations: function() {
		this.removeAllChildren();

		var centerSprite = sand.currentRegion.getSprite();
		this.addChild(centerSprite);

		centerSprite.attr({
			x: sand.constants.kViewportWidth / 2 + sand.constants.kCanvasWidth / 2 - sand.player.globalCoordinates.x + (sand.currentRegion.x * sand.constants.kCanvasWidth),
			y: sand.constants.kViewportWidth / 2 + sand.constants.kCanvasWidth / 2 - sand.player.globalCoordinates.y + (sand.currentRegion.y * sand.constants.kCanvasWidth)
		});

		var adjacentSprites = sand.currentRegion.getAdjacentNodes().map(function (region) {
			if(region !== undefined) {
				var sprite = region.getSprite();
				this.addChild(sprite);
				return sprite;
			} else {
				return undefined;
			}
		}, this);
		(function setAdjacentSpriteCoordinates(sprites, center, offset) {
			if(sprites[0] !== undefined) { sprites[0].attr({x: center.x + offset, y: center.y + offset});}	// northeast region
			if(sprites[1] !== undefined) { sprites[1].attr({x: center.x + 0,      y: center.y + offset});}	// north region
			if(sprites[2] !== undefined) { sprites[2].attr({x: center.x - offset, y: center.y + offset});}	// northwest region
			if(sprites[3] !== undefined) { sprites[3].attr({x: center.x - offset, y: center.y + 0});}		// west region
			if(sprites[4] !== undefined) { sprites[4].attr({x: center.x - offset, y: center.y - offset});}	// southwest region
			if(sprites[5] !== undefined) { sprites[5].attr({x: center.x + 0,      y: center.y - offset});}	// south region
			if(sprites[6] !== undefined) { sprites[6].attr({x: center.x + offset, y: center.y - offset});}	// southeast region
			if(sprites[7] !== undefined) { sprites[7].attr({x: center.x + offset, y: center.y + 0});}		// east region
		})(adjacentSprites, centerSprite, sand.constants.kCanvasWidth);
	}
});