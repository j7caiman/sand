var ElephantLayer = cc.Layer.extend({
	ctor: function () {
		this._super();
		this.init();
	},

	init: function () {
		var that = this;
		that._super();

		cc.spriteFrameCache.addSpriteFrames(res.ui_sprite_plist);
		cc.spriteFrameCache.addSpriteFrames(res.elephant_sprite_plist);

		that.zOrders = {
			itemsInInventory: 3,
			inventoryBackground: 2,
			itemsBeingCarried: 1,
			playerElephant: 0,
			otherElephants: -1,
			itemsOnGround: -2
		};

		that.inventoryBackgroundSprite = new cc.Sprite("#ui_background.png");
		that.inventoryBackgroundSprite.setPosition(20, 20);
		that.inventoryBackgroundSprite.setScaleX(1.5);
		that.inventoryBackgroundSprite.setAnchorPoint(0, 0);
		that.inventoryBackgroundSprite.setZOrder(that.zOrders.inventoryBackground);
		that.addChild(that.inventoryBackgroundSprite);

		var itemPositionX = that.inventoryBackgroundSprite.getPositionX() + 20;
		var InventoryItem = function(name, defaultFrame, selectedFrame, unavailableFrame) {
			this.name = name;

			this.inventorySprite = new cc.Sprite('#' + defaultFrame);
			this.placedSprite = new cc.Sprite('#' + defaultFrame);

			this.defaultFrame = cc.spriteFrameCache.getSpriteFrame(defaultFrame);
			this.selectedFrame = cc.spriteFrameCache.getSpriteFrame(selectedFrame);
			this.unavailableFrame = cc.spriteFrameCache.getSpriteFrame(unavailableFrame);

			this.available = true;

			this.inventorySprite.setPosition(itemPositionX, that.inventoryBackgroundSprite.getPositionY() + 10);
			itemPositionX += 20;
			this.inventorySprite.setZOrder(that.zOrders.itemsInInventory);

			this.placedSprite.setVisible(false);

			that.addChild(this.inventorySprite);
			that.addChild(this.placedSprite);
		};

		var inventory = [
			new InventoryItem("rock0", "rock.png", "rock_selected.png", "rock_unavailable.png"),
			new InventoryItem("rock1", "rock.png", "rock_selected.png", "rock_unavailable.png"),
			new InventoryItem("rock2", "rock.png", "rock_selected.png", "rock_unavailable.png"),
			new InventoryItem("rock3", "rock.png", "rock_selected.png", "rock_unavailable.png")
		];
		that.inventory = inventory;

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
				return new cc.Animation(frames, 0.15);
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

			that.elephantAnimationData = {
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
				if (!cc.rectContainsPoint(that.inventoryBackgroundSprite.getBoundingBox(), position)) {
					sand.elephantPath = [];
					sand.elephantPath.push({
						x: position.x,
						y: position.y - sand.constants.kFootprintVerticalOffset
					});
				}
			},

			onTouchesMoved: function (touches) {
				var position = touches[0].getLocation();
				if (!cc.rectContainsPoint(that.inventoryBackgroundSprite.getBoundingBox(), position)) {
					var lastVertex = sand.elephantPath[sand.elephantPath.length - 1];
					var newVertex = {
						x: position.x,
						y: position.y - sand.constants.kFootprintVerticalOffset
					};
					var distance = sand.globalFunctions.calculateDistance(lastVertex, newVertex);
					if (distance >= sand.modifyRegion.brushes.painting[0].frequency) {
						sand.elephantPath.push(newVertex);
					}
				}
			},

			onTouchesEnded: function (touches) {
				var position = touches[0].getLocation();
				var sprite = sand.elephantLayer.playerSprite;

				var inventoryItemClicked = (function processInventoryItem () {
					return inventory.some(function (item) {
						if (cc.rectContainsPoint(item.inventorySprite.getBoundingBox(), position)) {
							if (item.available) {
								sprite.stopActionByTag("moveElephant");
								that._stopAllAnimations(sprite);

								if (sand.playerState.selectedItem === item) { // deselect selected item
									that._deselectSelectedItemInInventory();
								} else { // select item in inventory, deselect other items
									that._deselectSelectedItemInInventory();
									that._deselectSelectedItemOnGround();

									sand.playerState.selectedItem = item;

									item.inventorySprite.setSpriteFrame(item.selectedFrame);
									item.placedSprite.setSpriteFrame(item.defaultFrame);
									item.placedSprite.setVisible(true);
									item.placedSprite.setZOrder(that.zOrders.itemsBeingCarried);
								}
							}

							return true;
						} else if (cc.rectContainsPoint(item.placedSprite.getBoundingBox(), position)) {
							// deselect other items
							that._deselectSelectedItemInInventory();
							that._deselectSelectedItemOnGround();

							// select item on ground, move elephant to fetch it
							sand.playerState.putBackItem = item;
							item.placedSprite.setSpriteFrame(item.selectedFrame);

							sand.elephantLayer.movePlayerElephantToLocation(
								sand.elephantLayer.playerSprite,
								position,
								function() {
									sand.socket.emit('rockPickedUp', {
										uuid: sand.uuid,
										rockName: sand.playerState.putBackItem.name
									});

									that._resetItem(sand.playerState.putBackItem);
									sand.playerState.putBackItem = false;
								}
							);

							return true;
						}
					});
				})();

				// ground was clicked
				if (!inventoryItemClicked) {
					that._deselectSelectedItemOnGround();

					// move, then place selected item on ground
					if (sand.playerState.selectedItem) {
						sand.elephantLayer.movePlayerElephantToLocation(sprite, position, function () {
							sand.socket.emit('rockPutDown', {
								uuid: sand.uuid,
								rockName: sand.playerState.selectedItem.name,
								position: {
									x: Math.round(sand.globalCoordinates.x),
									y: Math.round(sand.globalCoordinates.y)
								}
							});

							// place item on ground
							sand.playerState.selectedItem.placedSprite.setPosition(
								sand.elephantLayer.playerSprite.x,
								sand.elephantLayer.playerSprite.y
							);
							sand.playerState.selectedItem.inventorySprite.setSpriteFrame(sand.playerState.selectedItem.unavailableFrame);
							sand.playerState.selectedItem.placedSprite.setZOrder(that.zOrders.itemsOnGround);
							sand.playerState.selectedItem.available = false;
							sand.playerState.selectedItem = false;
						});
					} else if (sand.elephantPath.length === 1) {
						sand.elephantLayer.movePlayerElephantToLocation(sprite, sand.elephantPath[0]);
					} else {
						sand.elephantLayer.moveElephantAlongPath(sprite, sand.elephantPath);
					}
				}
			}
		}, this);
	},

	_resetItem: function (item) {
		item.inventorySprite.setSpriteFrame(item.defaultFrame);
		item.placedSprite.setVisible(false);
		item.available = true;
	},

	_deselectSelectedItemOnGround: function () {
		if (sand.playerState.putBackItem) {
			sand.playerState.putBackItem.placedSprite.setSpriteFrame(sand.playerState.putBackItem.defaultFrame);
			sand.playerState.putBackItem = false;
		}
	},

	_deselectSelectedItemInInventory: function () {
		if (sand.playerState.selectedItem) {
			this._resetItem(sand.playerState.selectedItem);
			sand.playerState.selectedItem = false;
		}
	},

	createElephant: function (position, zOrder, tag) { // tag is an optional parameter
		var sprite = new cc.Sprite("#elephant_sprite_sheet_01.png");

		sprite.setPosition(position);
		sprite.setScale(1.5);
		sprite.setAnchorPoint(0.5, 0);
		sprite.setZOrder(zOrder);

		this.addChild(sprite, undefined, tag);
		return sprite;
	},

	moveElephantAlongPath: function (sprite, brushStrokePath) {
		var that = this;

		var startPosition = sprite.getPosition();
		var endPosition;
		var previousElephantAnimationTag;

		var elephantPath = [];
		elephantPath.push(cc.callFunc(function () {
			sand.playerState.painting = false;
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
					sand.playerState.painting = true;
				}));
			}

			if (index === brushStrokePath.length - 1) {
				elephantPath.push(cc.callFunc(function () {
					that._stopAllAnimations(sprite);
					sprite.setSpriteFrame(elephantAnimationData.standFrame);
					sand.playerState.painting = false;
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

	movePlayerElephantToLocation: function (sprite, destination, onComplete) {
		var that = this;

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