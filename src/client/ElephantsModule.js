var sand = sand || {};
sand.elephants = (function () {
	var playerSprite;
	var otherPlayers = {};
	var shovelSprite;

	// constants
	var elephantFrames;
	var shovelUpStrokeDelayMillis = 500;
	var shovelUpStrokePositionOffset = 22;
	var minimumShovelDragDistance = 20;

	// state variables
	var playerPath;
	var shovelInStrokeOccurring = false;
	var shovelOutStrokeOccurring = false;
	var digDownGlobalPosition;
	var currentFramesData; // shows the current direction the elephant sprite is facing

	var brushTypeWhileMoving;

	function getPlayerBrushWhileMoving() {
		return brushTypeWhileMoving;
	}

	function getPlayerSprite() {
		return playerSprite;
	}

	function getScrollableSprites() {
		var sprites = [];
		for (var uuid in otherPlayers) {
			if (otherPlayers.hasOwnProperty(uuid)) {
				sprites.push(otherPlayers[uuid].sprite);
			}
		}

		sprites.push(playerSprite);
		sprites.push(shovelSprite);

		return sprites;
	}

	function initializeOnSceneStart() {
		elephantFrames = (function initializeElephantFrames() {
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

			return {
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

		currentFramesData = elephantFrames.west;

		playerSprite = createElephant(
			{
				x: window.innerWidth / 2,
				y: window.innerHeight / 2
			},
			sand.entitiesLayer.zOrders.playerElephant
		);
		playerSprite.setName("player");

		shovelSprite = new cc.Sprite("#shovel_icon.png");
		shovelSprite.setScale(1.5);
		shovelSprite.setZOrder(sand.entitiesLayer.zOrders.shovelingAnimation);
		shovelSprite.setVisible(false);
		sand.entitiesLayer.addChild(shovelSprite);

		sand.socket.on('playerMoved', function (playerData) {
			createOrMoveOtherPlayerToLocation(playerData);
		});

		sand.socket.on('playerDisconnected', function (uuid) {
			if (otherPlayers[uuid] !== undefined) {
				var spriteTag = otherPlayers[uuid].sprite.getTag();
				sand.entitiesLayer.removeChildByTag(spriteTag);
				delete otherPlayers[uuid];
			}
		});
	}

	function initializeOnSocketConnect(players) {
		players.forEach(function (playerData) {
			if (playerData.uuid !== sand.uuid) {
				createOrMoveOtherPlayerToLocation(playerData);
			}
		});
	}

	function createElephant(position, zOrder, tag) {
		var sprite = new cc.Sprite("#elephant_sprite_sheet_01.png");

		if (tag !== undefined) {
			sprite.setTag(tag);
		}
		sprite.setPosition(position);
		sprite.setScale(1.5);
		sprite.setAnchorPoint(0.5, 0.2);
		sprite.setZOrder(zOrder);

		sand.backgroundLayer.addScrollActionToNewSprite(sprite);
		sand.entitiesLayer.addChild(sprite);
		return sprite;
	}

	function createOrMoveOtherPlayerToLocation(playerData) {
		var location = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(playerData.position);
		if (otherPlayers[playerData.uuid] === undefined) {
			otherPlayers[playerData.uuid] = {
				sprite: createElephant(
					location,
					sand.entitiesLayer.zOrders.otherElephants,
					sand.cocosTagCounter++
				),
				timeSinceLastCommand: Date.now()
			};
		} else {
			var otherPlayer = otherPlayers[playerData.uuid];
			var now = Date.now();
			/**
			 * If an elephant has been standing still and gets a new position to move to,
			 * begin to move it to the new location at the default speed.
			 * However, if an elephant is currently moving and receives a new position,
			 * cancel the last move command and move it for a duration equal to the
			 * time difference between when it received its last position and its most
			 * recent one. This way, if the last position was received late due to lag, the
			 * elephant won't fall behind too far, since it will move faster to
			 * compensate.
			 */
			if (!otherPlayer.sprite.getActionByTag("moveElephant")) {
				moveOtherElephantToLocation(otherPlayer.sprite, location);
			} else {
				var duration = (now - otherPlayer.timeSinceLastCommand) / 1000;
				moveOtherElephantToLocation(otherPlayer.sprite, location, duration);
			}
			otherPlayer.timeSinceLastCommand = now;
		}
	}

	function handleOnTouchBeganEvent(position) {
		playerPath = [];
		playerPath.push({
			x: position.x,
			y: position.y
		});
	}

	function handleOnTouchMovedEvent(position) {
		var lastVertex = playerPath[playerPath.length - 1];
		var newVertex = {
			x: position.x,
			y: position.y
		};
		var distance = sand.globalFunctions.calculateDistance(lastVertex, newVertex);

		if (sand.traveller.wasPaintbrushChosen()) {
			if (distance >= sand.modifyRegion.brushes.painting.frequency) {
				playerPath.push(newVertex);
			}
		} else if (sand.traveller.wasShovelChosen()) {
			if (!shovelInStrokeOccurring && !shovelOutStrokeOccurring && distance > minimumShovelDragDistance) {
				pushShovelIntoGround(position);
			}
		}
	}

	function handleOnTouchEndedEvent(position) {
		if (sand.traveller.wasPaintbrushChosen()) {
			if (playerPath.length > 1) {
				movePlayerElephantAlongPath();
			} else {
				movePlayerElephantToLocation(position);
			}
		} else if (sand.traveller.wasShovelChosen()) {
			if (shovelInStrokeOccurring) {
				pullShovelOutOfGround();
			} else {
				movePlayerElephantToLocation(position);
			}
		} else {
			movePlayerElephantToLocation(position);
		}
	}

	function pushShovelIntoGround(mousePosition) {
		stopPlayerElephant();

		shovelInStrokeOccurring = true;

		var angle = Math.atan2(
			mousePosition.y - playerSprite.y,
			mousePosition.x - playerSprite.x
		);

		var digDownPosition = {
			x: playerSprite.x + shovelUpStrokePositionOffset * Math.cos(angle),
			y: playerSprite.y + shovelUpStrokePositionOffset * Math.sin(angle)
		};

		currentFramesData = chooseElephantAnimationData(angle);
		playerSprite.setSpriteFrame(currentFramesData.standFrame);
		playerSprite.setFlippedX(currentFramesData.spriteFlipped);

		if (angle < -Math.PI / 2) {
			shovelSprite.setFlippedX(false);
			shovelSprite.setFlippedY(false);
		} else if (angle < 0) {
			shovelSprite.setFlippedX(true);
			shovelSprite.setFlippedY(false);
		} else if (angle < Math.PI / 2) {
			shovelSprite.setFlippedX(true);
			shovelSprite.setFlippedY(true);
		} else {
			shovelSprite.setFlippedX(false);
			shovelSprite.setFlippedY(true);
		}

		shovelSprite.setPosition(digDownPosition);
		shovelSprite.setVisible(true);

		digDownGlobalPosition = sand.globalFunctions.convertOnScreenPositionToGlobalCoordinates(digDownPosition);
		sand.globalFunctions.addFootprintToQueue(digDownGlobalPosition, sand.modifyRegion.brushes.shovelIn.name);
	}

	function pullShovelOutOfGround() {
		shovelInStrokeOccurring = false;
		shovelOutStrokeOccurring = true;

		var digDownPosition = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(digDownGlobalPosition);

		var digUpPosition = {
			x: (playerSprite.x - digDownPosition.x) + playerSprite.x,
			y: (playerSprite.y - digDownPosition.y) + playerSprite.y
		};


		shovelSprite.setFlippedX(!shovelSprite.isFlippedX());
		shovelSprite.setFlippedY(!shovelSprite.isFlippedY());

		shovelSprite.setPosition(digUpPosition);
		shovelSprite.setVisible(true);

		var digUpGlobalPosition = sand.globalFunctions.convertOnScreenPositionToGlobalCoordinates(digUpPosition);
		sand.globalFunctions.addFootprintToQueue(digUpGlobalPosition, sand.modifyRegion.brushes.shovelOut.name);

		setTimeout(function () {
			shovelSprite.setVisible(false);
			shovelOutStrokeOccurring = false;
		}, shovelUpStrokeDelayMillis);
	}

	function movePlayerElephantAlongPath() {
		var sprite = playerSprite;

		var startPosition = sprite.getPosition();
		var endPosition;
		var previousElephantAnimationTag;

		var actionSequence = [];
		actionSequence.push(cc.callFunc(function () {
			brushTypeWhileMoving = sand.modifyRegion.brushes.walking.name;
		}));
		playerPath.forEach(function (element, index) {
			endPosition = element;
			var distance = sand.globalFunctions.calculateDistance(startPosition, endPosition);
			var duration = distance / sand.constants.kElephantSpeed;

			var angle = Math.atan2(
				endPosition.y - startPosition.y,
				endPosition.x - startPosition.x
			);
			var framesData = chooseElephantAnimationData(angle);

			if (index === 0 && sprite.getActionByTag(framesData.animationTag)) {
				previousElephantAnimationTag = framesData.animationTag;
			}

			if (previousElephantAnimationTag !== framesData.animationTag) {
				actionSequence.push(cc.callFunc(function () {
					stopAllAnimations(sprite);
					sprite.flippedX = framesData.spriteFlipped;

					var walkAnimation = cc.animate(framesData.walkAnimation).repeatForever();
					walkAnimation.setTag(framesData.animationTag);
					sprite.runAction(walkAnimation);

					currentFramesData = framesData;
				}));
			}
			actionSequence.push(cc.moveBy(duration, endPosition.x - startPosition.x, endPosition.y - startPosition.y));

			if (index === 0) {
				actionSequence.push(cc.callFunc(function () {
					brushTypeWhileMoving = sand.modifyRegion.brushes.painting.name;
				}));
			}

			if (index === playerPath.length - 1) {
				actionSequence.push(cc.callFunc(function () {
					stopAllAnimations(sprite);
					sprite.setSpriteFrame(framesData.standFrame);
					brushTypeWhileMoving = sand.modifyRegion.brushes.walking.name;
				}));
			}

			previousElephantAnimationTag = framesData.animationTag;
			startPosition = endPosition;
		});

		sprite.stopActionByTag("moveElephant");
		var action = cc.sequence(actionSequence);
		action.setTag("moveElephant");
		sprite.runAction(action);
	}

	function movePlayerElephantToLocation(destination, onComplete) {
		var sprite = playerSprite;

		var elephantPosition = sprite.getPosition();

		var distance = sand.globalFunctions.calculateDistance(elephantPosition, destination);
		var duration = distance / sand.constants.kElephantSpeed;

		var angle = Math.atan2(
			destination.y - elephantPosition.y,
			destination.x - elephantPosition.x
		);
		currentFramesData = chooseElephantAnimationData(angle);

		/**
		 * If the elephant is already walking in the same direction as this new
		 * command arrives, don't restart the animation.
		 */
		if (!sprite.getActionByTag(currentFramesData.animationTag)) {
			/**
			 * If the elephant isn't currently walking or is walking a different
			 * direction, stop the animation and start a new one.
			 */
			stopAllAnimations(sprite);

			var walkAnimation = cc.animate(currentFramesData.walkAnimation).repeatForever();
			walkAnimation.setTag(currentFramesData.animationTag);
			sprite.runAction(walkAnimation);
		}

		brushTypeWhileMoving = sand.modifyRegion.brushes.walking.name;
		sprite.flippedX = currentFramesData.spriteFlipped;

		sprite.stopActionByTag("moveElephant");
		var moveToAction = cc.moveTo(duration, destination);

		var standAction = cc.callFunc(function () {
			/**
			 *  It's necessary to stop the "moveElephant" action because even though this action
			 *  is supposedly only run after the cc.moveTo action is complete, the elephant still
			 *  moves a little bit if a scroll action occurred while the elephant was walking.
			 *  Root cause unknown, presumably a bug with cocos2d.
			 */
			stopPlayerElephant();

			if (onComplete !== undefined) {
				onComplete();
			}
		});

		var moveToThenStopAction = cc.sequence(moveToAction, standAction);
		moveToThenStopAction.setTag("moveElephant");
		sprite.runAction(moveToThenStopAction);
	}

	function stopPlayerElephant() {
		var sprite = playerSprite;

		sprite.stopActionByTag("moveElephant");
		stopAllAnimations(sprite);
		sprite.setSpriteFrame(currentFramesData.standFrame);
	}

	function moveOtherElephantToLocation(sprite, destination, duration) {
		var elephantPosition = sprite.getPosition();

		var distance = sand.globalFunctions.calculateDistance(elephantPosition, destination);
		if (duration === undefined) {
			duration = distance / sand.constants.kElephantSpeed;
		}

		var angle = Math.atan2(
			destination.y - elephantPosition.y,
			destination.x - elephantPosition.x
		);
		var elephantAnimationData = chooseElephantAnimationData(angle);

		if (!sprite.getActionByTag(elephantAnimationData.animationTag)) {
			stopAllAnimations(sprite);

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

				stopAllAnimations(sprite);
				sprite.setSpriteFrame(elephantAnimationData.standFrame);

			}, 0.5);
		});

		var moveToThenStopAction = cc.sequence(moveToAction, standAction);
		moveToThenStopAction.setTag("moveElephant");
		sprite.runAction(moveToThenStopAction);
	}

	function chooseElephantAnimationData(angle) {
		if (Math.abs(angle) > 3 * Math.PI / 4) {
			return elephantFrames.west;
		} else if (angle < -Math.PI / 4) {
			return elephantFrames.south;
		} else if (angle < Math.PI / 4) {
			return elephantFrames.east;
		} else {
			return elephantFrames.north;
		}
	}

	function stopAllAnimations(sprite) {
		sprite.stopActionByTag("animate_west");
		sprite.stopActionByTag("animate_south");
		sprite.stopActionByTag("animate_east");
		sprite.stopActionByTag("animate_north");
	}


	return {
		initializeOnSceneStart: initializeOnSceneStart,
		initializeOnSocketConnect: initializeOnSocketConnect,
		getPlayerBrushWhileMoving: getPlayerBrushWhileMoving,
		getPlayerSprite: getPlayerSprite,
		getScrollableSprites: getScrollableSprites,
		handleOnTouchBeganEvent: handleOnTouchBeganEvent,
		handleOnTouchMovedEvent: handleOnTouchMovedEvent,
		handleOnTouchEndedEvent: handleOnTouchEndedEvent,
		movePlayerElephantToLocation: movePlayerElephantToLocation,
		stopPlayerElephant: stopPlayerElephant
	};
})();