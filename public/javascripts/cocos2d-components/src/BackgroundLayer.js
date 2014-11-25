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

		var localPlayerPosition = sand.globalFunctions.toLocalCoordinates(sand.player.globalCoordinates);
		this.initializeSpriteLocations({
			x: sand.constants.kViewportWidth / 2 - localPlayerPosition.x,
			y: sand.constants.kViewportWidth / 2 - localPlayerPosition.y
		});

		/**
		 * Custom listener reacts to scroll commands.
		 * Slides the player and background by (x,y) amount.
		 */
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

				var scrollVector = {
					x: event.getUserData().x,
					y: event.getUserData().y
				};

				var distance = (function(v) { return Math.sqrt( (v.x * v.x) + (v.y * v.y) ); })(scrollVector);
				var duration = distance / sand.constants.kScrollSpeed;

				allSprites.map(function(sprite) {
					sprite.runAction(cc.moveBy(duration, cc.p(scrollVector.x, scrollVector.y)));
				});

				var scrollPlayerAction = cc.moveBy(duration, cc.p(scrollVector.x, scrollVector.y));
				scrollPlayerAction.setTag("scrollPlayer");
				sand.player.sprite.runAction(scrollPlayerAction);
			}
		}, this);
	},

	initializeSpriteLocations: function(position) {
		var centerSprite = sand.currentRegion.getSprite();
		if(this.getChildByName(centerSprite.getName()) === null) {
			this.addChild(centerSprite);
		}
		centerSprite.setName(sand.currentRegion.getName());
		centerSprite.getTexture().initWithElement(sand.currentRegion.getCanvas());
		centerSprite.getTexture().handleLoadedTexture();

		centerSprite.setPosition(position.x, position.y);

		var adjacentSprites = sand.currentRegion.getAdjacentNodes().map(function (region) {
			if(region !== undefined) {
				var sprite = region.getSprite();
				if(this.getChildByName(sprite.getName()) === null) {
					this.addChild(sprite);
				}
				sprite.setName(region.getName());
				sprite.getTexture().initWithElement(region.getCanvas());
				sprite.getTexture().handleLoadedTexture();
				return sprite;
			} else {
				return undefined;
			}
		}, this);
		(function setAdjacentSpriteCoordinates(sprites, center, offset) {
			if(sprites[0] !== undefined) { sprites[0].setPosition(center.x + offset, center.y + offset);}	// northeast region
			if(sprites[1] !== undefined) { sprites[1].setPosition(center.x + 0,      center.y + offset);}	// north region
			if(sprites[2] !== undefined) { sprites[2].setPosition(center.x - offset, center.y + offset);}	// northwest region
			if(sprites[3] !== undefined) { sprites[3].setPosition(center.x - offset, center.y + 0);}		// west region
			if(sprites[4] !== undefined) { sprites[4].setPosition(center.x - offset, center.y - offset);}	// southwest region
			if(sprites[5] !== undefined) { sprites[5].setPosition(center.x + 0,      center.y - offset);}	// south region
			if(sprites[6] !== undefined) { sprites[6].setPosition(center.x + offset, center.y - offset);}	// southeast region
			if(sprites[7] !== undefined) { sprites[7].setPosition(center.x + offset, center.y + 0);}		// east region
		})(adjacentSprites, centerSprite, sand.constants.kCanvasWidth);
	}
});