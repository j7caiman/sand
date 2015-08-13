sand.reserveAreasModule = (function () {
	// game state variables
	var reservedAreas = {}; // key: uuid, value: [path]
	var rocksOnGround = {}; // key: rockId, value: sprite

	// player specific state variables
	var reserveAreasEnabled = false;

	var rockIdsOwnedByPlayer = [];
	var rockIdsInPocket = [];
	var selectedRockId;
	var isRockSelected = false;

	var footprintTimeouts = [];

	// sprites
	var rockIconBackground;
	var rockIcons = [];
	var rockCarriedByPlayerSprite;

	// constants
	var rockDefaultFrame;
	var rockActivatedFrame;
	var rockUnavailableFrame;

	// called after resources are loaded
	function initializeSocketsAndSpriteFrames() {
		sand.socket.on('rockPutDown', function (data) {
			var location = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(data.position);

			if (rocksOnGround[data.rockId] === undefined) {
				putRockOnGround(data.rockId, location);
			} else { // unknown whether this happens, or is possible
				rocksOnGround[data.rockId].setPosition(location);
			}
		});

		sand.socket.on('rockPickedUp', function (data) {
			if (data.uuid !== undefined) {
				delete reservedAreas[data.uuid];
				data.deactiveatedRockIds.forEach(function (rockId) {
					rocksOnGround[rockId].setSpriteFrame(rockDefaultFrame);
				});
			}

			removeRockOnGround(data.rockId);
		});

		sand.socket.on('areaReserved', function (data) {
			reservedAreas[data.uuid] = data.path;
			data.rockIds.forEach(function (rockId) {
				rocksOnGround[rockId].setSpriteFrame(rockActivatedFrame);
			});
		});

		rockDefaultFrame = cc.spriteFrameCache.getSpriteFrame("rock.png");
		rockActivatedFrame = cc.spriteFrameCache.getSpriteFrame("rock_activated.png");
		rockUnavailableFrame = cc.spriteFrameCache.getSpriteFrame("rock_unavailable.png");
	}

	// called once socket connection established
	function initializeRocksAndReservedAreas(data) {
		var rocks = data.rocks;
		var activatedRockIds = data.activatedRockIds;

		for (var rockId in rocks) {
			if (rocks.hasOwnProperty(rockId)) {
				var location = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(rocks[rockId]);
				putRockOnGround(rockId, location);
			}
		}

		activatedRockIds.forEach(function(rockId) {
			rocksOnGround[rockId].setSpriteFrame(rockActivatedFrame);
		});

		reservedAreas = data.reservedAreas;
	}

	// called after player logs in
	function initializePlayerRockInventory(rocks) {
		// initialize rock on player's back, for when rocks are selected
		rockCarriedByPlayerSprite = new cc.Sprite("#rock.png");
		rockCarriedByPlayerSprite.setZOrder(sand.entitiesLayer.zOrders.itemsBeingCarried);
		rockCarriedByPlayerSprite.setVisible(false);
		sand.entitiesLayer.addChild(rockCarriedByPlayerSprite);

		// initialize clickable background
		rockIconBackground = new cc.Sprite("#ui_background.png");
		rockIconBackground.setPosition(20, 20);
		rockIconBackground.setAnchorPoint(0, 0);
		rockIconBackground.setZOrder(sand.entitiesLayer.zOrders.inventoryBackground);
		sand.entitiesLayer.addChild(rockIconBackground);

		// initialize the four rocks in the player's inventory
		rocks.forEach(function (rock, index) {
			rockIdsOwnedByPlayer.push(rock.id);
			var sprite = new cc.Sprite("#rock.png");
			sprite.setPosition(
				rockIconBackground.getPositionX() + 20 * (index + 1),
				rockIconBackground.getPositionY() + 10);
			sprite.setZOrder(sand.entitiesLayer.zOrders.itemsInInventory);
			sand.entitiesLayer.addChild(sprite);

			rockIcons.push(sprite);

			if (!(rock.x && rock.y)) {
				rockIdsInPocket.push(rock.id);
			}
		});

		for (var i = rockIdsInPocket.length; i < rocks.length; i++) {
			rockIcons[i].setSpriteFrame(rockUnavailableFrame);
		}

		reserveAreasEnabled = true;
	}

	function putRockOnGround(id, location) {
		if (rocksOnGround[id] === undefined) {
			var sprite = new cc.Sprite("#rock.png");
			sprite.setTag(sand.cocosTagCounter++);
			sprite.setPosition(location);
			sprite.setZOrder(sand.entitiesLayer.zOrders.itemsOnGround);

			sand.backgroundLayer.addScrollActionToNewSprite(sprite);
			sand.entitiesLayer.addChild(sprite);

			rocksOnGround[id] = sprite;
		}

		return rocksOnGround[id];
	}

	function removeRockOnGround(id) {
		if (rocksOnGround[id] !== undefined) {
			var spriteTag = rocksOnGround[id].getTag();
			sand.entitiesLayer.removeChildByTag(spriteTag);
			delete rocksOnGround[id];
		}
	}

	function getRocksOnGround() {
		return rocksOnGround;
	}

	function getReservedAreas() {
		return reservedAreas;
	}

	function wereRockIconsClicked(position) {
		return cc.rectContainsPoint(rockIconBackground.getBoundingBox(), position);
	}

	// modifies selectedRockId
	function wereRocksOnGroundClicked(position) {
		return rockIdsOwnedByPlayer.some(function (rockId) {
			if (rocksOnGround[rockId] !== undefined) {
				if (cc.rectContainsPoint(rocksOnGround[rockId].getBoundingBox(), position)) {
					selectedRockId = rockId;
					return true;
				}
			}
		});
	}

	function selectRock() {
		if (rockIdsInPocket.length > 0) {
			selectedRockId = rockIdsInPocket.pop();
			rockIcons[rockIdsInPocket.length].setSpriteFrame(rockUnavailableFrame);

			isRockSelected = true;
			rockCarriedByPlayerSprite.setVisible(true);
		}
	}

	function deselectRock() {
		rockIcons[rockIdsInPocket.length].setSpriteFrame(rockDefaultFrame);
		rockIdsInPocket.push(selectedRockId);

		isRockSelected = false;
		rockCarriedByPlayerSprite.setVisible(false);
	}

	function placeRockOnGround() {
		// notify server
		sand.socket.emit('rockPutDown', {
			uuid: sand.uuid,
			rockId: selectedRockId,
			position: {
				x: Math.round(sand.globalCoordinates.x),
				y: Math.round(sand.globalCoordinates.y)
			}
		});

		// place rock
		putRockOnGround(selectedRockId, sand.entitiesLayer.playerSprite);
		isRockSelected = false;
		rockCarriedByPlayerSprite.setVisible(false);

		checkAndApplyReservedArea();
	}

	function checkAndApplyReservedArea() {
		var allRocksPlaced = rockIdsInPocket.length === 0;
		if (!allRocksPlaced) {
			return;
		}

		var points = [];
		rockIdsOwnedByPlayer.forEach(function (rockId) {
			points.push(sand.globalFunctions.convertOnScreenPositionToGlobalCoordinates(rocksOnGround[rockId]));
		});

		var perimeter = sand.modifyRegion.getReservedPerimeterIfValid(points);
		if (!perimeter) {
			return;
		}

		var borderPath = sand.modifyRegion.createPointsAlongPath(perimeter);

		footprintTimeouts = [];
		var totalDuration = 2000; // 1 second
		for (var i = 0; i < borderPath.length / 2; i++) {
			footprintTimeouts.push(setTimeout((function (i) {
				return function () {
					sand.globalFunctions.addFootprintToQueue(borderPath[i], "walking");
					var j = borderPath.length - 1 - i;
					if (j !== i) {
						sand.globalFunctions.addFootprintToQueue(borderPath[parseInt(borderPath.length - 1 - i)], "walking");
					}
				}
			})(i), ((i + 1) / borderPath.length) * 2 * totalDuration));
		}
		footprintTimeouts.push(setTimeout(function () {
			reservedAreas[sand.uuid] = perimeter;
			rockIdsOwnedByPlayer.forEach(function (rockId) {
				rocksOnGround[rockId].setSpriteFrame(rockActivatedFrame);
			});

			sand.socket.emit('reserveArea', {
				uuid: sand.uuid
			});
		}, totalDuration));
	}

	function pickRockUpFromGround() {
		sand.socket.emit('rockPickedUp', {
			uuid: sand.uuid,
			rockId: selectedRockId
		});

		rockIcons[rockIdsInPocket.length].setSpriteFrame(rockDefaultFrame);
		rockIdsInPocket.push(selectedRockId);

		removeRockOnGround(selectedRockId);

		footprintTimeouts.forEach(function (timeoutId) {
			clearTimeout(timeoutId);
		});

		removeReservedArea();
	}

	function removeReservedArea() {
		if (reservedAreas[sand.uuid] !== undefined) {
			delete reservedAreas[sand.uuid];
			rockIdsOwnedByPlayer.forEach(function (rockId) {
				if (rocksOnGround[rockId] !== undefined) {
					rocksOnGround[rockId].setSpriteFrame(rockDefaultFrame);
				}
			});
		}
	}

	function handleTouchEvent(position, onNoActivity) {
		if (!reserveAreasEnabled) {
			onNoActivity();
			return;
		}

		if (wereRockIconsClicked(position)) {
			if (isRockSelected) {
				deselectRock();
			} else {
				selectRock();
			}
		} else { // user clicked ground
			if (isRockSelected) {
				sand.entitiesLayer.movePlayerElephantToLocation(
					position,
					placeRockOnGround
				);
			} else if (wereRocksOnGroundClicked(position)) {
				sand.entitiesLayer.movePlayerElephantToLocation(
					position,
					pickRockUpFromGround
				);
			} else {
				onNoActivity();
			}
		}
	}

	function updateCarriedSpritePosition() {
		if (isRockSelected) {
			rockCarriedByPlayerSprite.setPosition(
				sand.entitiesLayer.playerSprite.x,
				sand.entitiesLayer.playerSprite.y + sand.constants.kElephantHeightOffset
			);
		}
	}

	return {
		initializeSocketsAndSpriteFrames: initializeSocketsAndSpriteFrames,
		initializeRocksAndReservedAreas: initializeRocksAndReservedAreas,
		initializePlayerRockInventory: initializePlayerRockInventory,

		getRocksOnGround: getRocksOnGround,
		getReservedAreas: getReservedAreas,

		handleTouchEvent: handleTouchEvent,
		updateCarriedSpritePosition: updateCarriedSpritePosition
	}
})();