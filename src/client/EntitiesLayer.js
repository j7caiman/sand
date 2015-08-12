var EntitiesLayer = cc.Layer.extend({
	ctor: function () {
		this._super();
		this.init();
	},

	zOrders: {
		itemsInInventory: 3,
		inventoryBackground: 2,
		itemsBeingCarried: 1,
		playerElephant: 0,
		traveller: -1,
		otherElephants: -2,
		itemsOnGround: -3
	},

	init: function () {
		var that = this;
		that._super();

		cc.spriteFrameCache.addSpriteFrames(resources.ui_sprite_plist);
		cc.spriteFrameCache.addSpriteFrames(resources.elephant_sprite_plist);

		that.playerSprite = that.createElephant(
			{
				x: window.innerWidth / 2,
				y: window.innerHeight / 2
			},
			that.zOrders.playerElephant
		);
		that.playerSprite.setName("player");

		(function initializeElephantFrames() {
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

			var walkWest = (function () {
				var frames = [];
				for (var i = 2; i <= 9; i++) {
					var name = "elephant_sprite_sheet_0" + i + ".png";
					var frame = cc.spriteFrameCache.getSpriteFrame(name);
					frames.push(frame);
				}
				return new cc.Animation(frames, 0.15);
			})();

			var standWest = (function () {
				var name = "elephant_sprite_sheet_01.png";
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

			that.elephantAnimationData = {
				north: {
					walkAnimation: walkNorth,
					standFrame: standNorth,
					animationTag: "animate_north",
					spriteFlipped: false
				},

				west: {
					walkAnimation: walkWest,
					standFrame: standWest,
					animationTag: "animate_west",
					spriteFlipped: false
				},

				south: {
					walkAnimation: walkSouth,
					standFrame: standSouth,
					animationTag: "animate_south",
					spriteFlipped: false
				},

				east: {
					walkAnimation: walkWest,
					standFrame: standWest,
					animationTag: "animate_east",
					spriteFlipped: true
				}
			};
		})();

		/**
		 * This listener catches both touchscreen and mouse input.
		 * All input events are processed here, including moving the elephant around and manipulating menus.
		 *
		 * Note: a more sensible way to do this would be to have a listener for each layer. However, there is no
		 * way to prevent all the listeners from being triggered for every event, since the "swallowTouches"
		 * property only works on cc.EventListener.TOUCH_ONE_BY_ONE, and that particular listener doesn't
		 * properly capture mouse up and mouse drag events.
		 */
		cc.eventManager.addListener({
			event: cc.EventListener.TOUCH_ALL_AT_ONCE,

			onTouchesBegan: function (touches) {
				var position = touches[0].getLocation();
				sand.elephantPath = [];
				sand.elephantPath.push({
					x: position.x,
					y: position.y - sand.constants.kFootprintVerticalOffset
				});
			},

			onTouchesMoved: function (touches) {
				var position = touches[0].getLocation();
				var lastVertex = sand.elephantPath[sand.elephantPath.length - 1];
				var newVertex = {
					x: position.x,
					y: position.y - sand.constants.kFootprintVerticalOffset
				};
				var distance = sand.globalFunctions.calculateDistance(lastVertex, newVertex);
				if (distance >= sand.modifyRegion.brushes.digging[0].frequency) {
					sand.elephantPath.push(newVertex);
				}
			},

			onTouchesEnded: function (touches) {
				var position = touches[0].getLocation();
				sand.reserveAreasModule.handleTouchEvent(position,
					function () {
						if (sand.elephantPath.length === 1) {
							sand.entitiesLayer.movePlayerElephantToLocation(sand.elephantPath[0]);
						} else {
							sand.entitiesLayer.moveElephantAlongPath(sand.entitiesLayer.playerSprite, sand.elephantPath);
						}
					}
				);
			}
		}, this);

		$('#loading').hide();
		$('#signIn').show();
		if(typeof userRemembered === 'function') {
			userRemembered();
		}
	},

	createElephant: function (position, zOrder, tag) {
		var sprite = new cc.Sprite("#elephant_sprite_sheet_01.png");

		if(tag !== undefined) {
			sprite.setTag(tag);
		}
		sprite.setPosition(position);
		sprite.setScale(1.5);
		sprite.setAnchorPoint(0.5, 0);
		sprite.setZOrder(zOrder);

		sand.backgroundLayer.addScrollActionToNewSprite(sprite);

		this.addChild(sprite);
		return sprite;
	},

	moveElephantAlongPath: function (sprite, brushStrokePath) {
		var that = this;

		var startPosition = sprite.getPosition();
		var endPosition;
		var previousElephantAnimationTag;

		var elephantPath = [];
		elephantPath.push(cc.callFunc(function () {
			sand.playerState.currentAction = sand.playerState.mouseClickAction;
		}));
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
					sand.playerState.currentAction = sand.playerState.mouseDragAction;
				}));
			}

			if (index === brushStrokePath.length - 1) {
				elephantPath.push(cc.callFunc(function () {
					that._stopAllAnimations(sprite);
					sprite.setSpriteFrame(elephantAnimationData.standFrame);
					sand.playerState.currentAction = sand.playerState.mouseClickAction;
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

	movePlayerElephantToLocation: function (destination, onComplete) {
		var that = this;
		var sprite = sand.entitiesLayer.playerSprite;

		var elephantPosition = sprite.getPosition();

		var distance = sand.globalFunctions.calculateDistance(elephantPosition, destination);
		var duration = distance / sand.constants.kElephantSpeed;

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
		}

		sand.playerState.currentAction = sand.playerState.mouseClickAction;
		sprite.flippedX = elephantAnimationData.spriteFlipped;

		sprite.stopActionByTag("moveElephant");
		var moveToAction = cc.moveTo(duration, destination);

		var standAction = cc.callFunc(function () {
			/**
			 *  It's necessary to stop the "moveElephant" action because even though this action
			 *  is supposedly only run after the cc.moveTo action is complete, the elephant still
			 *  moves a little bit if a scroll action occurred while the elephant was walking.
			 *  Root cause unknown, presumably a bug with cocos2d.
			 */
			sprite.stopActionByTag("moveElephant");
			that._stopAllAnimations(sprite);
			sprite.setSpriteFrame(elephantAnimationData.standFrame);

			if (onComplete !== undefined) {
				onComplete();
			}
		}, this);

		var moveToThenStopAction = cc.sequence(moveToAction, standAction);
		moveToThenStopAction.setTag("moveElephant");
		sprite.runAction(moveToThenStopAction);
	},

	moveOtherElephantToLocation: function (sprite, destination, duration) {
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

		if (!sprite.getActionByTag(elephantAnimationData.animationTag)) {
			that._stopAllAnimations(sprite);

			var walkAnimation = cc.animate(elephantAnimationData.walkAnimation).repeatForever();
			walkAnimation.setTag(elephantAnimationData.animationTag);
			sprite.runAction(walkAnimation);
		} else {
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

		var standAction = cc.callFunc(function () {
			sprite.scheduleOnce(function () {
				sprite.stopActionByTag("moveElephant");

				that._stopAllAnimations(sprite);
				sprite.setSpriteFrame(elephantAnimationData.standFrame);

			}, 0.5);
		}, this);

		var moveToThenStopAction = cc.sequence(moveToAction, standAction);
		moveToThenStopAction.setTag("moveElephant");
		sprite.runAction(moveToThenStopAction);
	},

	_chooseElephantAnimationData: function (angle) {
		if (Math.abs(angle) > 3 * Math.PI / 4) {
			return this.elephantAnimationData.west;
		} else if (angle < - Math.PI / 4) {
			return this.elephantAnimationData.south;
		} else if (angle < Math.PI / 4) {
			return this.elephantAnimationData.east;
		} else {
			return this.elephantAnimationData.north;
		}
	},

	_stopAllAnimations: function (sprite) {
		sprite.stopActionByTag("animate_west");
		sprite.stopActionByTag("animate_south");
		sprite.stopActionByTag("animate_east");
		sprite.stopActionByTag("animate_north");
	}
});