/**
 * Layer which listens for the mouse and moves / animates the player character.
 */
var ElephantLayer = cc.Layer.extend({
	ctor: function () {
		this._super();
		this.init();
	},

	init: function () {
		this._super();

		// read sprite sheet from file system
		cc.spriteFrameCache.addSpriteFrames(res.elephant_sprite_plist);

		this.playerSprite = this.createElephant({
			x: sand.constants.kViewportWidth / 2,
			y: sand.constants.kViewportHeight / 2
		});
		this.playerSprite.setName("player");

		var walkNorth = (function () {
			var frames = [];
			for (var i = 11; i <= 12; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var standNorth = (function () {
			var name = "elephant_sprite_sheet_11.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var walkNorthwest = (function () {
			var frames = [];
			for (var i = 10; i <= 10; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var standNorthwest = (function () {
			var name = "elephant_sprite_sheet_10.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var walkWest = (function () {
			var frames = [];
			for (var i = 2; i <= 9; i++) {
				var name = "elephant_sprite_sheet_0" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var standWest = (function () {
			var name = "elephant_sprite_sheet_01.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var walkSouthwest = (function () {
			var frames = [];
			for (var i = 14; i <= 14; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var standSouthwest = (function () {
			var name = "elephant_sprite_sheet_14.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var walkSouth = (function () {
			var frames = [];
			for (var i = 15; i <= 16; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var standSouth = (function () {
			var name = "elephant_sprite_sheet_15.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		this.elephantAnimationData = {
			north: {
				walkAnimation: walkNorth,
				standFrame: standNorth,
				animationTag: "animate_north",
				spriteFlipped: false
			},

			northwest: {
				walkAnimation: walkNorthwest,
				standFrame: standNorthwest,
				animationTag: "animate_northwest",
				spriteFlipped: false
			},

			west: {
				walkAnimation: walkWest,
				standFrame: standWest,
				animationTag: "animate_west",
				spriteFlipped: false
			},

			southwest: {
				walkAnimation: walkSouthwest,
				standFrame: standSouthwest,
				animationTag: "animate_southwest",
				spriteFlipped: false
			},

			south: {
				walkAnimation: walkSouth,
				standFrame: standSouth,
				animationTag: "animate_south",
				spriteFlipped: false
			},

			southeast: {
				walkAnimation: walkSouthwest,
				standFrame: standSouthwest,
				animationTag: "animate_southeast",
				spriteFlipped: true
			},

			east: {
				walkAnimation: walkWest,
				standFrame: standWest,
				animationTag: "animate_east",
				spriteFlipped: true
			},

			northeast: {
				walkAnimation: walkNorthwest,
				standFrame: standNorthwest,
				animationTag: "animate_northeast",
				spriteFlipped: true
			}
		};

		// set up listener to trigger animations
		cc.eventManager.addListener({
			event: cc.EventListener.MOUSE,

			onMouseDown: function (event) {
				sand.elephantPath = [];
				sand.elephantPath.push(event.getLocation());
			},

			onMouseMove: function (event) {
				if (event.getButton() == 0) { // left click
					var lastVertex = sand.elephantPath[sand.elephantPath.length - 1];
					var distance = sand.globalFunctions.calculateDistance(lastVertex, event.getLocation());
					if (distance >= sand.constants.kBrushPathMinimumLineSegmentWidth) {
						sand.elephantPath.push(event.getLocation());
					}
				}
			},

			onMouseUp: function (event) {
				// debug: right click to generate dunes
				if (event.getButton() == 2) {
					sand.modifyRegion.generateLargeDune();
					return;
				}

				var sprite = sand.elephantLayer.playerSprite;
				if (sand.elephantPath.length === 1) {
					sand.elephantLayer.moveElephantToLocation(sprite, sand.elephantPath[0]);
				} else {
					sand.elephantLayer.moveElephantAlongPath(sprite, sand.elephantPath);
				}
			}
		}, this);
	},

	createElephant: function (position, tag) { // tag is an optional parameter
		var sprite = new cc.Sprite("#elephant_sprite_sheet_01.png");

		sprite.setPosition(position);
		sprite.setScale(1.5);
		sprite.setAnchorPoint(0.5, 0.5);

		this.addChild(sprite, undefined, tag);
		return sprite;
	},

	moveElephantAlongPath: function (sprite, brushStrokePath) {
		var that = this;

		var startPosition = sprite.getPosition();
		var endPosition;
		var previousElephantAnimationTag;

		var elephantPath = [];
		brushStrokePath.forEach(function (element, index) {
			endPosition = element;
			var distance = sand.globalFunctions.calculateDistance(startPosition, endPosition);
			var duration = distance / sand.constants.kElephantSpeed;

			var angle = Math.atan2(
				endPosition.y - startPosition.y,
				endPosition.x - startPosition.x
			);
			var elephantAnimationData = that._chooseElephantAnimationData(angle);

			if (index === 0 && sprite.getActionByTag(elephantAnimationData.animationTag)) {
				previousElephantAnimationTag = elephantAnimationData.animationTag;
			}

			if (previousElephantAnimationTag !== elephantAnimationData.animationTag) {
				elephantPath.push(cc.callFunc(function () {
					that._stopAllAnimations(sprite);
					sprite.flippedX = elephantAnimationData.spriteFlipped;

					var walkAnimation = cc.animate(elephantAnimationData.walkAnimation).repeatForever();
					walkAnimation.setTag(elephantAnimationData.animationTag);
					sprite.runAction(walkAnimation);
				}));
			}
			elephantPath.push(cc.moveBy(duration, endPosition.x - startPosition.x, endPosition.y - startPosition.y));

			if (index === 0) {
				elephantPath.push(cc.callFunc(function () {
					sand.isPlayerPainting = true;
				}));
			}

			if (index === brushStrokePath.length - 1) {
				elephantPath.push(cc.callFunc(function () {
					that._stopAllAnimations(sprite);
					sprite.setSpriteFrame(elephantAnimationData.standFrame);
					sand.isPlayerPainting = false;
				}));
			}

			previousElephantAnimationTag = elephantAnimationData.animationTag;
			startPosition = endPosition;
		});

		sprite.stopActionByTag("moveElephant");
		var action = cc.sequence(elephantPath);
		action.setTag("moveElephant");
		sprite.runAction(action);
	},

	moveElephantToLocation: function (sprite, destination, duration) {
		var that = this;

		var elephantPosition = sprite.getPosition();

		var distance = sand.globalFunctions.calculateDistance(elephantPosition, destination);
		if (duration === undefined) {
			duration = distance / sand.constants.kElephantSpeed;
		}

		var angle = Math.atan2(
			destination.y - elephantPosition.y,
			destination.x - elephantPosition.x
		);
		var elephantAnimationData = that._chooseElephantAnimationData(angle);

		/**
		 * If the elephant is already walking in the same direction as this new
		 * command arrives, don't restart the animation.
		 */
		if (!sprite.getActionByTag(elephantAnimationData.animationTag)) {
			/**
			 * If the elephant isn't currently walking or is walking a different
			 * direction, stop the animation and start a new one.
			 */
			that._stopAllAnimations(sprite);

			var walkAnimation = cc.animate(elephantAnimationData.walkAnimation).repeatForever();
			walkAnimation.setTag(elephantAnimationData.animationTag);
			sprite.runAction(walkAnimation);
		} else if (sprite.getName() !== "player" && sprite.getActionByTag(elephantAnimationData.animationTag)) {
			/**
			 * It would be preferable to only unschedule the callback
			 * which is added with scheduleOnce below.
			 * However the moveElephant function gets called more than
			 * once, and therefore the callback is overwritten with a
			 * new reference to itself. thus when trying to remove it,
			 * it will fail.
			 *
			 * This callback, if called, tells the elephant to stop walking
			 * and stand. If the elephant is already walking in this direction,
			 * do nothing.
			 *
			 * Elephants which are not the player are not immediately stopped from walking
			 * to work around jittery movement.
			 */
			sprite.unscheduleAllCallbacks();
		}

		sprite.flippedX = elephantAnimationData.spriteFlipped;
		sprite.stopActionByTag("moveElephant");
		var moveToAction = cc.moveTo(duration, destination);

		var standAction;
		if (sprite.getName() === "player") {
			standAction = cc.callFunc(function () {
				that._stopAllAnimations(sprite);
				sprite.setSpriteFrame(elephantAnimationData.standFrame);
			}, this);
		} else {
			standAction = cc.callFunc(function () {
				sprite.scheduleOnce(function () {
					that._stopAllAnimations(sprite);
					sprite.setSpriteFrame(elephantAnimationData.standFrame);
				}, 0.5);
			}, this);
		}

		var moveToThenStopAction = cc.sequence(moveToAction, standAction);
		moveToThenStopAction.setTag("moveElephant");
		sprite.runAction(moveToThenStopAction);
	},

	_chooseElephantAnimationData: function (angle) {
		if (Math.abs(angle) > 7 * Math.PI / 8) {
			return this.elephantAnimationData.west;
		} else if (angle < -5 * Math.PI / 8) {
			return this.elephantAnimationData.southwest;
		} else if (angle < -3 * Math.PI / 8) {
			return this.elephantAnimationData.south;
		} else if (angle < -Math.PI / 8) {
			return this.elephantAnimationData.southeast;
		} else if (angle < Math.PI / 8) {
			return this.elephantAnimationData.east;
		} else if (angle < 3 * Math.PI / 8) {
			return this.elephantAnimationData.northeast;
		} else if (angle < 5 * Math.PI / 8) {
			return this.elephantAnimationData.north;
		} else {
			return this.elephantAnimationData.northwest;
		}
	},

	_stopAllAnimations: function (sprite) {
		sprite.stopActionByTag("animate_west");
		sprite.stopActionByTag("animate_southwest");
		sprite.stopActionByTag("animate_south");
		sprite.stopActionByTag("animate_southeast");
		sprite.stopActionByTag("animate_east");
		sprite.stopActionByTag("animate_northeast");
		sprite.stopActionByTag("animate_north");
		sprite.stopActionByTag("animate_northwest");
	}
});