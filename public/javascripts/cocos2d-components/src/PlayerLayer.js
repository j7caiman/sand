/**
 * Layer which listens for the mouse and moves / animates the player character.
 */
var PlayerLayer = cc.Layer.extend({
	ctor: function() {
		this._super();
		this.init();
	},

	player: {},

	init: function() {
		this._super();

		// read sprite sheet from file system
		cc.spriteFrameCache.addSpriteFrames(res.elephant_sprite_plist);

		// create animations from frames, which come from the plist file
		var walkNorth = (function() {
			var frames = [];
			for (var i = 11; i 	<= 12; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var walkNorthWest = (function() {
			var frames = [];
			for (var i = 10; i <= 10; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var walkWest = (function() {
			var frames = [];
			for (var i = 2; i <= 9; i++) {
				var name = "elephant_sprite_sheet_0" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var walkSouthWest = (function() {
			var frames = [];
			for (var i = 14; i <= 14; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();

		var walkSouth = (function() {
			var frames = [];
			for (var i = 15; i <= 16; i++) {
				var name = "elephant_sprite_sheet_" + i + ".png";
				var frame = cc.spriteFrameCache.getSpriteFrame(name);
				frames.push(frame);
			}
			return new cc.Animation(frames, 0.3);
		})();
		
		var standNorth = (function() {
			var name = "elephant_sprite_sheet_11.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var standNorthWest = (function() {
			var name = "elephant_sprite_sheet_10.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var standWest = (function() {
			var name = "elephant_sprite_sheet_01.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var standSouthWest = (function() {
			var name = "elephant_sprite_sheet_14.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();

		var standSouth = (function() {
			var name = "elephant_sprite_sheet_15.png";
			return cc.spriteFrameCache.getSpriteFrame(name);
		})();


		// add player to scene
		var sprite = new cc.Sprite("#elephant_sprite_sheet_01.png");
		sprite.setName("player");
		this.player = sprite;

		// note: anchor point is at the center of the sprite
		sprite.attr({
			x: sand.constants.kViewportWidth / 2,
			y: sand.constants.kViewportHeight / 2,
			scaleX: 1.5,
			scaleY: 1.5
		});

		this.addChild(sprite);

		// set up listener to trigger animations
		cc.eventManager.addListener({
			event: cc.EventListener.MOUSE,

			onMouseUp: function(event) {
				function stopPlayerMovement() {
					sprite.stopActionByTag("animatePlayer");
					sprite.stopActionByTag("movePlayer");
					sprite.unscheduleAllCallbacks();
				}
				stopPlayerMovement();


				var elephantPosition = sprite.getPosition();
				var mousePosition = event.getLocation();

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

				var duration = distance.total / sand.constants.kPlayerSpeed;

				var moveAnimation;
				var frameAfterMove;
				sprite.flippedX = false;
				if(Math.abs(angle) > 7 * Math.PI / 8) {	// west
					moveAnimation = walkWest;
					frameAfterMove = standWest;
				} else if(angle < -5 * Math.PI / 8) {	// southwest
					moveAnimation = walkSouthWest;
					frameAfterMove = standSouthWest;
				} else if(angle < -3 * Math.PI / 8) {	// south
					moveAnimation = walkSouth;
					frameAfterMove = standSouth;
				} else if(angle < -Math.PI / 8) {		// southeast
					moveAnimation = walkSouthWest;
					frameAfterMove = standSouthWest;
					sprite.flippedX = true;
				} else if(angle < Math.PI / 8) {		// east
					moveAnimation = walkWest;
					frameAfterMove = standWest;
					sprite.flippedX = true;
				} else if(angle < 3 * Math.PI / 8) {	// northeast
					moveAnimation = walkNorthWest;
					frameAfterMove = standNorthWest;
					sprite.flippedX = true;
				} else if(angle < 5 * Math.PI / 8) {	// north
					moveAnimation = walkNorth;
					frameAfterMove = standNorth;
				} else {								// northwest
					moveAnimation = walkNorthWest;
					frameAfterMove = standNorthWest;
				}

				sprite.schedule(
					function() {
						sand.level.update();
					},
					0.25);

				var moveAction = cc.moveTo(duration, mousePosition);
				var standAction = cc.callFunc(function() {
					stopPlayerMovement();
					sprite.setSpriteFrame(frameAfterMove);
				}, this);

				var animatePlayerAction = cc.animate(moveAnimation).repeatForever();
				var movePlayerAction = cc.sequence(moveAction, standAction);

				animatePlayerAction.setTag("animatePlayer");
				movePlayerAction.setTag("movePlayer");

				sprite.runAction(animatePlayerAction);
				sprite.runAction(movePlayerAction);

				triggerScrolling();
				function triggerScrolling() {
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
						sprite.scheduleOnce(triggerScroll, thresholdCrossTime);
					}
				}
			}
		}, this);
	}
});