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

		var allRegions = sand.allRegions;
		for(var region in allRegions) {
			if(allRegions.hasOwnProperty(region)) {
				this.addChild(allRegions[region].getSprite());
			}
		}

		/**
		 * Custom listener reacts to scroll commands.
		 * Slides the player and background by (x,y) amount.
		 */
		cc.eventManager.addListener({
			event: cc.EventListener.CUSTOM,
			eventName: "scrollTrigger",
			callback: function (event) {
				var spritesToScroll = (function getAllScrollableSprites() {
					var sprites = [];
					var allRegions = sand.allRegions;
					for (var regionName in allRegions) {
						if (allRegions.hasOwnProperty(regionName)) {
							sprites.push(allRegions[regionName].getSprite());
						}
					}
					var otherPlayers = sand.otherPlayers;
					for (var uuid in otherPlayers) {
						if (otherPlayers.hasOwnProperty(uuid)) {
							sprites.push(otherPlayers[uuid].sprite);
						}
					}
					sprites.push(sand.elephantLayer.playerSprite);
					return sprites;
				})();

				spritesToScroll.forEach(function (sprite) {
					sprite.stopActionByTag("scroll");
				});

				var scrollVector = {
					x: event.getUserData().x,
					y: event.getUserData().y
				};

				var distance = (function (v) {
					return Math.sqrt((v.x * v.x) + (v.y * v.y));
				})(scrollVector);
				var duration = distance / sand.constants.kScrollSpeed;

				spritesToScroll.forEach(function (sprite) {
					var scrollAction = cc.moveBy(duration, scrollVector.x, scrollVector.y);
					scrollAction.setTag("scroll");
					sprite.runAction(scrollAction);
				});
			}
		}, this);
	}
});