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

		var sprite = new cc.Sprite(new cc.Texture2D());
		this.addChild(sprite);
		this.backgroundSprite = sprite;
		var adjacentSprites = [];
		for (var i = 0; i < 8; i++) {
			adjacentSprites.push(new cc.Sprite(new cc.Texture2D()));
			this.addChild(adjacentSprites[i]);
		}
		this.adjacentSprites = adjacentSprites;

		/**
		 * Coordinates start at the center of the sprite, and the sprite is the size of the html canvas.
		 * This does the following:
		 * 	- (sand.constants.kCanvasWidth / 2) puts the bottom left of the sprite in the bottom left corner
		 * 	- (sand.constants.kViewportWidth / 2) moves the bottom left of the sprite to the middle of the viewport
		 * 	- ( -sand.player.globalCoordinates) moves the sprite back down to wherever the player is
		 */
		sprite.attr({
			x: sand.constants.kViewportWidth / 2 + (sand.constants.kCanvasWidth / 2 - sand.player.globalCoordinates.x),
			y: sand.constants.kViewportWidth / 2 + (sand.constants.kCanvasWidth / 2 - sand.player.globalCoordinates.y)
		});

		(function setAdjacentSpriteCoordinates(sprites, mainSprite, offset) {
			sprites[0].attr({                                    // northeast region
				x: mainSprite.x + offset,
				y: mainSprite.y + offset
			});
			sprites[1].attr({                                    // north region
				x: mainSprite.x + 0,
				y: mainSprite.y + offset
			});
			sprites[2].attr({                                    // northwest region
				x: mainSprite.x - offset,
				y: mainSprite.y + offset
			});
			sprites[3].attr({                                    // west region
				x: mainSprite.x - offset,
				y: mainSprite.y + 0
			});
			sprites[4].attr({                                    // southwest region
				x: mainSprite.x - offset,
				y: mainSprite.y - offset
			});
			sprites[5].attr({                                    // south region
				x: mainSprite.x + 0,
				y: mainSprite.y - offset
			});
			sprites[6].attr({                                    // southeast region
				x: mainSprite.x + offset,
				y: mainSprite.y - offset
			});
			sprites[7].attr({                                    // east region
				x: mainSprite.x + offset,
				y: mainSprite.y + 0
			});
		})(this.adjacentSprites, this.backgroundSprite, sand.constants.kCanvasWidth);

		//set up custom listener to react to scroll commands
		cc.eventManager.addListener({
			event: cc.EventListener.CUSTOM,
			eventName: "scrollTrigger",
			callback: function(event) {
				sprite.stopAllActions();
				for (var i = 0; i < adjacentSprites.length; i++) {
					adjacentSprites[i].stopAllActions();
				}
				sand.player.sprite.stopActionByTag("scrollPlayer");

				var delta = {
					x: event.getUserData().x - sprite.x,
					y: event.getUserData().y - sprite.y
				};

				var distance = (function(point1, point2) {
					var xDelta = point2.x - point1.x;
					var yDelta = point2.y - point1.y;

					return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
				})(sprite, event.getUserData());
				var duration = distance / sand.constants.kScrollSpeed;

				sprite.runAction(cc.moveBy(duration, cc.p(delta.x, delta.y)));
				for (var j = 0; j < adjacentSprites.length; j++) {
					adjacentSprites[j].runAction(cc.moveBy(duration, cc.p(delta.x, delta.y)));
				}

				var scrollPlayerAction = cc.moveBy(duration, cc.p(delta.x, delta.y));
				scrollPlayerAction.setTag("scrollPlayer");
				sand.player.sprite.runAction(scrollPlayerAction);
			}
		}, this);
	},

	updateSpriteTexture: function (sprite, canvasToRead) {
		sprite.getTexture().initWithElement(canvasToRead);
		sprite.getTexture().handleLoadedTexture();
	},

	backgroundSprite: {},
	adjacentSprites: []
});