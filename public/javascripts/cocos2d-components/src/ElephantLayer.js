/**
 * Layer which listens for the mouse and moves / animates the player character.
 */
var ElephantLayer = cc.Layer.extend({
	ctor: function() {
		this._super();
		this.init();
	},

	init: function() {
		this._super();

		// read sprite sheet from file system
		cc.spriteFrameCache.addSpriteFrames(res.elephant_sprite_plist);

		this.playerSprite = this.createElephant({
			x: sand.constants.kViewportWidth / 2,
			y: sand.constants.kViewportHeight / 2
		});
		this.playerSprite.setName("player");

		this.animations = {
			walkNorth: (function () {
				var frames = [];
				for (var i = 11; i <= 12; i++) {
					var name = "elephant_sprite_sheet_" + i + ".png";
					var frame = cc.spriteFrameCache.getSpriteFrame(name);
					frames.push(frame);
				}
				return new cc.Animation(frames, 0.3);
			})(),

				walkNorthWest: (function () {
				var frames = [];
				for (var i = 10; i <= 10; i++) {
					var name = "elephant_sprite_sheet_" + i + ".png";
					var frame = cc.spriteFrameCache.getSpriteFrame(name);
					frames.push(frame);
				}
				return new cc.Animation(frames, 0.3);
			})(),

				walkWest: (function () {
				var frames = [];
				for (var i = 2; i <= 9; i++) {
					var name = "elephant_sprite_sheet_0" + i + ".png";
					var frame = cc.spriteFrameCache.getSpriteFrame(name);
					frames.push(frame);
				}
				return new cc.Animation(frames, 0.3);
			})(),

				walkSouthWest: (function () {
				var frames = [];
				for (var i = 14; i <= 14; i++) {
					var name = "elephant_sprite_sheet_" + i + ".png";
					var frame = cc.spriteFrameCache.getSpriteFrame(name);
					frames.push(frame);
				}
				return new cc.Animation(frames, 0.3);
			})(),

				walkSouth: (function () {
				var frames = [];
				for (var i = 15; i <= 16; i++) {
					var name = "elephant_sprite_sheet_" + i + ".png";
					var frame = cc.spriteFrameCache.getSpriteFrame(name);
					frames.push(frame);
				}
				return new cc.Animation(frames, 0.3);
			})(),

				standNorth: (function () {
				var name = "elephant_sprite_sheet_11.png";
				return cc.spriteFrameCache.getSpriteFrame(name);
			})(),

				standNorthWest: (function () {
				var name = "elephant_sprite_sheet_10.png";
				return cc.spriteFrameCache.getSpriteFrame(name);
			})(),

				standWest: (function () {
				var name = "elephant_sprite_sheet_01.png";
				return cc.spriteFrameCache.getSpriteFrame(name);
			})(),

				standSouthWest: (function () {
				var name = "elephant_sprite_sheet_14.png";
				return cc.spriteFrameCache.getSpriteFrame(name);
			})(),

				standSouth: (function () {
				var name = "elephant_sprite_sheet_15.png";
				return cc.spriteFrameCache.getSpriteFrame(name);
			})()
		};

		// set up listener to trigger animations
		cc.eventManager.addListener({
			event: cc.EventListener.MOUSE,
			onMouseUp: function(event) {
				var sprite = sand.elephantLayer.playerSprite;
				sand.elephantLayer.moveElephant(sprite, event.getLocation());

				sprite.schedule(
					sand.globalFunctions.updateRegionsAndDrawCanvases,
					0.25);
			}
		}, this);
	},

	createElephant: function(position) {
		var sprite = new cc.Sprite("#elephant_sprite_sheet_01.png");

		// note: anchor point is at the center of the sprite
		sprite.setPosition(position);
		sprite.setScale(1.5);

		this.addChild(sprite);
		return sprite;
	},

	moveElephant: function(sprite, destination) {
		function stopElephantMovement() {
			sprite.stopActionByTag("animateElephant");
			sprite.stopActionByTag("moveElephant");
			sprite.unscheduleAllCallbacks();
		}
		stopElephantMovement();

		var elephantPosition = sprite.getPosition();
		var mousePosition = destination;

		var angle = Math.atan2(
			mousePosition.y - elephantPosition.y,
			mousePosition.x - elephantPosition.x
		);

		var distance = (function(point1, point2) {
			var xDelta = point2.x - point1.x;
			var yDelta = point2.y - point1.y;

			return {
				total: Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) ),
				x: Math.abs(xDelta),
				y: Math.abs(yDelta)
			};
		})(elephantPosition, mousePosition);

		var duration = distance.total / sand.constants.kElephantSpeed;

		var moveAnimation;
		var frameAfterMove;
		if(Math.abs(angle) > 7 * Math.PI / 8) {				// west
			moveAnimation = this.animations.walkWest;
			frameAfterMove = this.animations.standWest;
			sprite.flippedX = false;
		} else if(angle < -5 * Math.PI / 8) {				// southwest
			moveAnimation = this.animations.walkSouthWest;
			frameAfterMove = this.animations.standSouthWest;
			sprite.flippedX = false;
		} else if(angle < -3 * Math.PI / 8) {				// south
			moveAnimation = this.animations.walkSouth;
			frameAfterMove = this.animations.standSouth;
			sprite.flippedX = false;
		} else if(angle < -Math.PI / 8) {					// southeast
			moveAnimation = this.animations.walkSouthWest;
			frameAfterMove = this.animations.standSouthWest;
			sprite.flippedX = true;
		} else if(angle < Math.PI / 8) {					// east
			moveAnimation = this.animations.walkWest;
			frameAfterMove = this.animations.standWest;
			sprite.flippedX = true;
		} else if(angle < 3 * Math.PI / 8) {				// northeast
			moveAnimation = this.animations.walkNorthWest;
			frameAfterMove = this.animations.standNorthWest;
			sprite.flippedX = true;
		} else if(angle < 5 * Math.PI / 8) {				// north
			moveAnimation = this.animations.walkNorth;
			frameAfterMove = this.animations.standNorth;
			sprite.flippedX = false;
		} else {											// northwest
			moveAnimation = this.animations.walkNorthWest;
			frameAfterMove = this.animations.standNorthWest;
			sprite.flippedX = false;
		}

		var moveAction = cc.moveTo(duration, mousePosition);
		var standAction = cc.callFunc(function() {
			stopElephantMovement();
			sprite.setSpriteFrame(frameAfterMove);
		}, this);

		var animateElephantAction = cc.animate(moveAnimation).repeatForever();
		var moveElephantAction = cc.sequence(moveAction, standAction);

		animateElephantAction.setTag("animateElephant");
		moveElephantAction.setTag("moveElephant");

		sprite.runAction(animateElephantAction);
		sprite.runAction(moveElephantAction);
	}
});