/**
 * Layer which listens for the mouse and moves / animates the player character.
 */
var PlayerMovementLayer = cc.Layer.extend({
	ctor: function() {
		this._super();
		this.init();
	},
	
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

		sprite.attr({
			x: this.getContentSize().width / 2,
			y: this.getContentSize().height / 2,
			scaleX: 1.5,
			scaleY: 1.5
		});

		this.addChild(sprite);

		// set up listener to trigger animations
		cc.eventManager.addListener({
			event: cc.EventListener.MOUSE,
			onMouseMove: function(event) {},

			onMouseUp: function(event) {
				sprite.stopAllActions();

				var elephantPosition = sprite.getPosition();
				var mousePosition = event.getLocation();

				var angle = Math.atan2(
					mousePosition.y - elephantPosition.y,
					mousePosition.x - elephantPosition.x
				);

				var distance = (function(point1, point2) {
					var xDelta = point2.x - point1.x;
					var yDelta = point2.y - point1.y;

					return Math.sqrt( (xDelta * xDelta) + (yDelta * yDelta) );
				})(elephantPosition, mousePosition);

				const speed = 25;
				var duration = distance / speed;

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

				var actionMove = cc.moveTo(duration, mousePosition);
				var actionMoveDone = cc.callFunc(function() {
					sprite.stopAllActions();
					sprite.setSpriteFrame(frameAfterMove);
				}, this);

				sprite.runAction(cc.animate(moveAnimation).repeatForever());
				sprite.runAction(cc.sequence(actionMove, actionMoveDone));
			}
		}, this);
	}
});