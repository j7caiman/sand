/**
 * The sand is drawn through a grid of canvases.
 * These canvases are edited directly, without cocos2d,
 * by manipulating the pixels in their imageData.
 *
 * Each canvas's imageData is put into a Texture2D, which is then
 * rendered inside a Sprite. The Sprites are then moved appropriately
 * for scroll events.
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
		for (var region in allRegions) {
			if (allRegions.hasOwnProperty(region)) {
				this.addChild(allRegions[region].getSprite());
			}
		}

		/**
		 * Custom listener reacts to scroll commands.
		 * Slides objects and background by (x,y) amount.
		 */
		var that = this;
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

					var rocks = sand.reserveAreasModule.getRocksOnGround();
					for (var rockId in rocks) {
						if (rocks.hasOwnProperty(rockId)) {
							sprites.push(rocks[rockId]);
						}
					}

					sprites.push(sand.elephants.getPlayerSprite());
					sprites = sprites.concat(sand.elephants.getOtherPlayerSprites());

					sprites.push(sand.traveller.getTravellerSprite());

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
					var scrollAction = cc.moveBy(duration, scrollVector);
					scrollAction.setTag("scroll");
					sprite.runAction(scrollAction);
				});

				that.currentScroll = {
					startTime: Date.now(),
					durationSeconds: duration,
					x: scrollVector.x,
					y: scrollVector.y
				};
			}
		}, this);
	},

	/**
	 * Entities that are created after a scroll action has begun will not have
	 * a scroll action attached to them. Thus, a scroll action must be added
	 * to them for the remaining amount of scrolling.
	 *
	 * @param sprite
	 */
	addScrollActionToNewSprite: function (sprite) {
		var currentScroll = this.currentScroll;
		if (currentScroll === undefined) {
			return;
		}

		var currentTimeMillis = Date.now();
		var endTimeMillis = currentScroll.startTime + currentScroll.durationSeconds * 1000;
		if (currentTimeMillis >= endTimeMillis) {
			delete this.currentScroll;
			return;
		}

		var remainingDurationSeconds = (endTimeMillis - currentTimeMillis) / 1000;
		var scrollAmountRemaining = (remainingDurationSeconds / currentScroll.durationSeconds);
		var scrollVector = {
			x: currentScroll.x * scrollAmountRemaining,
			y: currentScroll.y * scrollAmountRemaining
		};

		var scrollAction = cc.moveBy(remainingDurationSeconds, scrollVector);
		scrollAction.setTag("scroll");
		sprite.runAction(scrollAction);
	}
});