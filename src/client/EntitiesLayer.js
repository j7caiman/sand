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

	inventory: {
		initialized: false
	},

	init: function () {
		var that = this;
		that._super();

		cc.spriteFrameCache.addSpriteFrames(resources.ui_sprite_plist);
		cc.spriteFrameCache.addSpriteFrames(resources.elephant_sprite_plist);

		that.footprintTimeouts = [];

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
				var sprite = sand.entitiesLayer.playerSprite;

				if (that.inventory.initialized) {
					var inventoryItems = that.inventory.items;
					if (cc.rectContainsPoint(that.inventory.background.getBoundingBox(), position)) {
						if (cc.rectContainsPoint(that.inventory.shovelButton.getBoundingBox(), position)) {
							that.inventory.shovelButton.setSpriteFrame(that._shovelSelectedFrame);
							that.inventory.eraserButton.setSpriteFrame(that._eraserDefaultFrame);
							sand.playerState.mouseDragAction = "digging";
							return;
						} else if (cc.rectContainsPoint(that.inventory.eraserButton.getBoundingBox(), position)) {
							that.inventory.eraserButton.setSpriteFrame(that._eraserSelectedFrame);
							that.inventory.shovelButton.setSpriteFrame(that._shovelDefaultFrame);
							sand.playerState.mouseDragAction = "painting";
							return;
						}

						inventoryItems.forEach(function (item) {
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
							}
						});

						return;
					}

					for (var index in inventoryItems) {
						if (inventoryItems.hasOwnProperty(index)) {
							var item = inventoryItems[index];
							if (cc.rectContainsPoint(item.placedSprite.getBoundingBox(), position)) {
								// deselect other items
								that._deselectSelectedItemInInventory();
								that._deselectSelectedItemOnGround();

								// select item on ground
								sand.playerState.putBackItem = item;
								if(item.activated) {
									item.placedSprite.setSpriteFrame(sand.entitiesLayer._rockActivatedAndSelectedFrame);
								} else {
									item.placedSprite.setSpriteFrame(item.selectedFrame);
								}

								// move elephant, then pick up item
								sand.entitiesLayer.movePlayerElephantToLocation(
									sand.entitiesLayer.playerSprite,
									position,
									function () {
										sand.socket.emit('rockPickedUp', {
											uuid: sand.uuid,
											id: sand.playerState.putBackItem.id
										});

										that._resetItem(sand.playerState.putBackItem);
										sand.playerState.putBackItem = false;
										that.footprintTimeouts.forEach(function (timeoutId) {
											clearTimeout(timeoutId);
										});

										if(sand.reservedAreas[sand.uuid] !== undefined) {
											delete sand.reservedAreas[sand.uuid];
											that.inventory.items.forEach(function(item) {
												if(item.placedSprite !== undefined) {
													item.placedSprite.setSpriteFrame(sand.entitiesLayer._rockDefaultFrame);
													item.activated = false;
												}
											});
										}
									}
								);

								return;
							}
						}
					}
				}

				// ground was clicked
				that._deselectSelectedItemOnGround();

				// move, then place selected item on ground
				if (that.inventory.initialized && sand.playerState.selectedItem) {
					sand.entitiesLayer.movePlayerElephantToLocation(sprite, position, function () {
						sand.socket.emit('rockPutDown', {
							uuid: sand.uuid,
							id: sand.playerState.selectedItem.id,
							position: {
								x: Math.round(sand.globalCoordinates.x),
								y: Math.round(sand.globalCoordinates.y)
							}
						});

						that._placeItemOnGround(sand.playerState.selectedItem, sand.entitiesLayer.playerSprite);
						sand.playerState.selectedItem = false;

						var points = [];
						var allRocksPlaced = that.inventory.items.every(function (item) {
							if(item.placedSprite !== undefined) {
								var point = sand.globalFunctions.convertOnScreenPositionToGlobalCoordinates(item.placedSprite.getPosition());
								points.push(point);
							}
							return !item.available;
						});

						if (allRocksPlaced) {
							var perimeter = sand.modifyRegion.getReservedPerimeterIfValid(points);
						}

						if(allRocksPlaced && perimeter) {
							var borderPath = sand.modifyRegion.createPointsAlongPath(perimeter);

							that.footprintTimeouts = [];
							var totalDuration = 2000; // 1 second
							for (var i = 0; i < borderPath.length / 2; i++) {
								that.footprintTimeouts.push(setTimeout((function (i) {
									return function () {
										sand.globalFunctions.addFootprintToQueue(borderPath[i], "walking");
										var j = borderPath.length - 1 - i;
										if (j !== i) {
											sand.globalFunctions.addFootprintToQueue(borderPath[parseInt(borderPath.length - 1 - i)], "walking");
										}
									}
								})(i), ((i + 1) / borderPath.length) * 2 * totalDuration));
							}
							that.footprintTimeouts.push(setTimeout(function () {
								sand.reservedAreas[sand.uuid] = perimeter;
								that.inventory.items.forEach(function (item) {
									item.placedSprite.setSpriteFrame(sand.entitiesLayer._rockActivatedFrame);
									item.activated = true;
								});
								sand.socket.emit('reserveArea', {
									uuid: sand.uuid
								});
							}, totalDuration));
						}

					});
				} else if (sand.elephantPath.length === 1) {
					sand.entitiesLayer.movePlayerElephantToLocation(sprite, sand.elephantPath[0]);
				} else {
					sand.entitiesLayer.moveElephantAlongPath(sprite, sand.elephantPath);
				}
			}
		}, this);

		// calls initializeInventory
		$('#loading').hide();
		$('#signIn').show();
		if(typeof userRemembered === 'function') {
			userRemembered();
		}

		this._rockDefaultFrame = cc.spriteFrameCache.getSpriteFrame("rock.png");
		this._rockActivatedFrame = cc.spriteFrameCache.getSpriteFrame("rock_activated.png");
		this._rockActivatedAndSelectedFrame = cc.spriteFrameCache.getSpriteFrame("rock_activated_selected.png");

		this._shovelSelectedFrame = cc.spriteFrameCache.getSpriteFrame("shovel_icon_selected.png");
		this._shovelDefaultFrame = cc.spriteFrameCache.getSpriteFrame("shovel_icon.png");

		this._eraserSelectedFrame = cc.spriteFrameCache.getSpriteFrame("eraser_icon_selected.png");
		this._eraserDefaultFrame = cc.spriteFrameCache.getSpriteFrame("eraser_icon.png");
	},

	initializeInventory: function (rocks) {
		var that = this;
		that.inventory.background = new cc.Sprite("#ui_background.png");
		that.inventory.background.setPosition(20, 20);
		that.inventory.background.setScaleX(1.5);
		that.inventory.background.setAnchorPoint(0, 0);
		that.inventory.background.setZOrder(that.zOrders.inventoryBackground);
		that.addChild(that.inventory.background);

		var itemPositionX = that.inventory.background.getPositionX();

		that.inventory.shovelButton = new cc.Sprite("#shovel_icon.png");
		that.inventory.shovelButton.setPosition(itemPositionX += 20, that.inventory.background.getPositionY() + 10);
		that.inventory.shovelButton.setZOrder(that.zOrders.itemsInInventory);
		that.addChild(that.inventory.shovelButton);

		that.inventory.eraserButton = new cc.Sprite("#eraser_icon.png");
		that.inventory.eraserButton.setPosition(itemPositionX += 20, that.inventory.background.getPositionY() + 10);
		that.inventory.eraserButton.setZOrder(that.zOrders.itemsInInventory);
		that.addChild(that.inventory.eraserButton);

		var InventoryItem = function (id, defaultFrame, selectedFrame, unavailableFrame) {
			this.id = id;

			this.inventorySprite = new cc.Sprite('#' + defaultFrame);
			this.placedSprite = new cc.Sprite('#' + defaultFrame);

			this.defaultFrame = cc.spriteFrameCache.getSpriteFrame(defaultFrame);
			this.selectedFrame = cc.spriteFrameCache.getSpriteFrame(selectedFrame);
			this.unavailableFrame = cc.spriteFrameCache.getSpriteFrame(unavailableFrame);

			this.available = true;

			this.inventorySprite.setPosition(itemPositionX += 20, that.inventory.background.getPositionY() + 10);
			this.inventorySprite.setZOrder(that.zOrders.itemsInInventory);

			this.placedSprite.setVisible(false);

			that.addChild(this.inventorySprite);
			that.addChild(this.placedSprite);
		};

		that.inventory.items = [];
		rocks.forEach(function(rock) {
			var item = new InventoryItem(rock.id,
				"rock.png",
				"rock_selected.png",
				"rock_unavailable.png");

			if(rock.x && rock.y) {
				var activated = rock.reserved_area_id !== null;
				that.removeOtherRock(rock.id);

				var position = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(rock);
				that._placeItemOnGround(item, position);
				if(activated) {
					item.activated = true;
					item.placedSprite.setSpriteFrame(sand.entitiesLayer._rockActivatedFrame);
				}
			}

			that.inventory.items.push(item);
		});

		that.inventory.initialized = true;
	},

	_placeItemOnGround: function(item, position) {
		item.placedSprite.setPosition(position);
		item.placedSprite.setZOrder(this.zOrders.itemsOnGround);
		item.placedSprite.setVisible(true);

		item.inventorySprite.setSpriteFrame(item.unavailableFrame);

		item.available = false;
	},

	_resetItem: function (item) {
		item.inventorySprite.setSpriteFrame(item.defaultFrame);
		item.placedSprite.setVisible(false);
		item.available = true;
	},

	_deselectSelectedItemOnGround: function () {
		if (sand.playerState.putBackItem) {
			var frame;
			if(sand.playerState.putBackItem.activated) {
				frame = sand.entitiesLayer._rockActivatedFrame;
			} else {
				frame = sand.playerState.putBackItem.defaultFrame;
			}

			sand.playerState.putBackItem.placedSprite.setSpriteFrame(frame);
			sand.playerState.putBackItem = false;
		}
	},

	_deselectSelectedItemInInventory: function () {
		if (sand.playerState.selectedItem) {
			this._resetItem(sand.playerState.selectedItem);
			sand.playerState.selectedItem = false;
		}
	},

	createOtherRock: function(id, location) {
		if (sand.otherRocks[id] === undefined) {
			var sprite = new cc.Sprite("#rock.png");
			sprite.setTag(sand.cocosTagCounter++);
			sprite.setPosition(location);
			sprite.setZOrder(this.zOrders.itemsOnGround);
			this.addChild(sprite);

			sand.otherRocks[id] = {
				sprite: sprite
			};
		}

		return sand.otherRocks[id];
	},

	removeOtherRock: function (id) {
		if (sand.otherRocks[id] !== undefined) {
			var spriteTag = sand.otherRocks[id].sprite.getTag();
			sand.entitiesLayer.removeChildByTag(spriteTag);
			delete sand.otherRocks[id];
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