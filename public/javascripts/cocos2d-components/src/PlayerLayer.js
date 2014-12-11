/**
 * Layer which listens for the mouse and moves / animates the player character.
 */
var PlayerLayer = cc.Layer.extend({
	ctor: function() {
		this._super();
		this.init();
	},

	player: {},
	animations: {
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
	},

	init: function() {
		this._super();

		cc.spriteFrameCache.addSpriteFrames(res.elephant_sprite_plist);

		// add player to scene
		var player = new cc.Sprite("#elephant_sprite_sheet_01.png");
		this.player = player;
		player.setName("player");

		// note: anchor point is at the center of the sprite
		player.attr({
			x: sand.constants.kViewportWidth / 2,
			y: sand.constants.kViewportHeight / 2,
			scaleX: 1.5,
			scaleY: 1.5
		});

		this.addChild(player);

		// set up listener to trigger animations
		cc.eventManager.addListener({
			event: cc.EventListener.MOUSE,

			onMouseUp: function(event) {
				PlayerLayer.stopPlayerMovement();

				var mousePosition = event.getLocation();
				PlayerLayer.moveElephant(player, mousePosition);

				player.schedule(
					sand.globalFunctions.updateRegionsAndDrawCanvases,
					0.25);

				triggerScrolling();
				function triggerScrolling() {
					var distance = (function(point1, point2) {
						var xDelta = point2.x - point1.x;
						var yDelta = point2.y - point1.y;

						return {
							total: Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) ),
							x: Math.abs(xDelta),
							y: Math.abs(yDelta)
						};
					})(player, mousePosition);

					var duration = distance.total / sand.constants.kPlayerSpeed;

					var elephantPosition = player.getPosition();

					var boundary = {
						left: sand.constants.kBeginScrollThreshold,
						right: sand.constants.kViewportWidth - sand.constants.kBeginScrollThreshold,
						bottom: sand.constants.kBeginScrollThreshold,
						top: sand.constants.kViewportHeight - sand.constants.kBeginScrollThreshold
					};

					var distanceToThreshold = {};
					if (mousePosition.x < boundary.left) {
						distanceToThreshold.x = elephantPosition.x - boundary.left;
					} else if (mousePosition.x > boundary.right) {
						distanceToThreshold.x = boundary.right - elephantPosition.x;
					}
					if (mousePosition.y < boundary.bottom) {
						distanceToThreshold.y = elephantPosition.y - boundary.bottom;
					} else if (mousePosition.y > boundary.top) {
						distanceToThreshold.y = boundary.top - elephantPosition.y;
					}

					var thresholdCrossTime;
					if (distanceToThreshold.x !== undefined) {
						thresholdCrossTime = duration * (distanceToThreshold.x / distance.x);
					}
					if (distanceToThreshold.y !== undefined) {
						var timeUntilYThreshold = duration * (distanceToThreshold.y / distance.y);
						if(thresholdCrossTime === undefined || timeUntilYThreshold < thresholdCrossTime) {
							thresholdCrossTime = timeUntilYThreshold;
						}
					}
					if(thresholdCrossTime < 0) { // elephant has already passed the threshold, scroll immediately
						thresholdCrossTime = 0;
					}

					if (thresholdCrossTime !== undefined) {
						var scrollVector = {
							x: sand.constants.kViewportWidth / 2 - mousePosition.x,
							y: sand.constants.kViewportHeight / 2 - mousePosition.y
						};
						function triggerScroll() {
							var event = new cc.EventCustom("scrollTrigger");
							event.setUserData(scrollVector);
							cc.eventManager.dispatchEvent(event);
						}
						player.scheduleOnce(triggerScroll, thresholdCrossTime);
					}
				}
			}
		}, this);
	},

	moveElephant: function(sprite, destination) {
		var currentPosition = sprite.getPosition();
		var angle = Math.atan2(
			destination.y - currentPosition.y,
			destination.x - currentPosition.x
		);

		var distance = (function(point1, point2) {
			var xDelta = point2.x - point1.x;
			var yDelta = point2.y - point1.y;

			return {
				total: Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) ),
				x: Math.abs(xDelta),
				y: Math.abs(yDelta)
			};
		})(currentPosition, destination);

		var duration = distance.total / sand.constants.kPlayerSpeed;

		var moveAnimation;
		var frameAfterMove;
		if(Math.abs(angle) > 7 * Math.PI / 8) {	// west
			moveAnimation = this.animations.walkWest;
			frameAfterMove = this.animations.standWest;
			sprite.flippedX = false;
		} else if(angle < -5 * Math.PI / 8) {	// southwest
			moveAnimation = this.animations.walkSouthWest;
			frameAfterMove = this.animations.standSouthWest;
			sprite.flippedX = false;
		} else if(angle < -3 * Math.PI / 8) {	// south
			moveAnimation = this.animations.walkSouth;
			frameAfterMove = this.animations.standSouth;
			sprite.flippedX = false;
		} else if(angle < -Math.PI / 8) {		// southeast
			moveAnimation = this.animations.walkSouthWest;
			frameAfterMove = this.animations.standSouthWest;
			sprite.flippedX = true;
		} else if(angle < Math.PI / 8) {		// east
			moveAnimation = this.animations.walkWest;
			frameAfterMove = this.animations.standWest;
			sprite.flippedX = true;
		} else if(angle < 3 * Math.PI / 8) {	// northeast
			moveAnimation = this.animations.walkNorthWest;
			frameAfterMove = this.animations.standNorthWest;
			sprite.flippedX = true;
		} else if(angle < 5 * Math.PI / 8) {	// north
			moveAnimation = this.animations.walkNorth;
			frameAfterMove = this.animations.standNorth;
			sprite.flippedX = false;
		} else {								// northwest
			moveAnimation = this.animations.walkNorthWest;
			frameAfterMove = this.animations.standNorthWest;
			sprite.flippedX = false;
		}

		var moveAction = cc.moveTo(duration, destination);
		var standAction = cc.callFunc(function() {
			this.stopPlayerMovement();
			sprite.setSpriteFrame(frameAfterMove);
		}, this);

		var animatePlayerAction = cc.animate(moveAnimation).repeatForever();
		var movePlayerAction = cc.sequence(moveAction, standAction);

		animatePlayerAction.setTag("animatePlayer");
		movePlayerAction.setTag("movePlayer");

		sprite.runAction(animatePlayerAction);
		sprite.runAction(movePlayerAction);
	},

	stopPlayerMovement: function() {
		sand.player.sprite.stopActionByTag("animatePlayer");
		sand.player.sprite.stopActionByTag("movePlayer");
		sand.player.sprite.unscheduleAllCallbacks();
	}
	
	
});