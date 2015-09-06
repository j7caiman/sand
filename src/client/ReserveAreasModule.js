sand.reserveAreasModule = (function () {
	// game state variables
	var reservedAreas = (function () {
		var map = {};

		function get(id) {
			return map[id];
		}

		function add(id, path) {
			map[id] = path;
		}

		function addAll(areas) {
			for (var id in areas) {
				if (areas.hasOwnProperty(id)) {
					map[id] = areas[id];
				}
			}
		}

		function remove(id) {
			delete map[id];
		}

		function containsPoint(point) {
			for (var id in map) {
				if (map.hasOwnProperty(id)) {
					var path = map[id];
					if (sand.modifyRegion.pointInsidePolygon(point, path)) {
						return true;
					}
				}
			}

			return false;
		}

		return {
			get: get,
			add: add,
			addAll: addAll,
			remove: remove,
			containsPoint: containsPoint
		}
	})();

	var rocksOnGround = (function () {
		var map = {};

		function place(id, location) {
			if (map[id] === undefined) {
				var sprite = new cc.Sprite("#rock.png");
				sprite.setTag(sand.cocosTagCounter++);
				sprite.setPosition(location);
				sprite.setZOrder(sand.entitiesLayer.zOrders.itemsOnGround);

				sand.backgroundLayer.addScrollActionToNewSprite(sprite);
				sand.entitiesLayer.addChild(sprite);

				map[id] = sprite;
			} else {
				map[id].setPosition(location);
			}
		}

		function remove(id) {
			if (map[id] !== undefined) {
				var spriteTag = map[id].getTag();
				sand.entitiesLayer.removeChildByTag(spriteTag);
				delete map[id];
			}
		}

		function activate(id) {
			map[id].setSpriteFrame(rockActivatedFrame);
		}

		function deactivate(id) {
			if (map[id] !== undefined) {
				map[id].setSpriteFrame(rockDefaultFrame);
			}
		}

		function getAllSprites() {
			var sprites = [];
			for (var id in map) {
				if (map.hasOwnProperty(id)) {
					sprites.push(map[id]);
				}
			}

			return sprites;
		}

		function wasClicked(id, position) {
			var sprite = map[id];
			if (sprite === undefined) {
				return false;
			}

			return cc.rectContainsPoint(sprite.getBoundingBox(), position);
		}

		function getPosition(id) {
			return map[id].getPosition();
		}

		return {
			place: place,
			remove: remove,
			activate: activate,
			deactivate: deactivate,
			getAllSprites: getAllSprites,
			getPosition: getPosition,
			wasClicked: wasClicked
		}
	})();

	// player specific state variables
	var rockIdsOwnedByPlayer = [];
	var rockIdsInPocket = [];
	var selectedRockId;
	var isRockSelected = false;

	var footprintTimeouts = [];

	// sprites
	var rockIcons = [];
	var rockCarriedByPlayerSprite;

	// constants
	var rockDefaultFrame;
	var rockActivatedFrame;
	var rockUnavailableFrame;

	function initializeOnSceneStart() {
		sand.socket.on('rockPutDown', function (data) {
			var location = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(data.position);
			rocksOnGround.place(data.rockId, location);
		});

		sand.socket.on('rockPickedUp', function (data) {
			rocksOnGround.remove(data.rockId);
		});

		sand.socket.on('areaReserved', function (data) {
			reservedAreas.add(data.reservedAreaId, data.path);
			data.rockIds.forEach(function (rockId) {
				rocksOnGround.activate(rockId);
			});
		});

		sand.socket.on('areaRemoved', function (data) {
			reservedAreas.remove(data.reservedAreaId);
			data.deactivatedRockIds.forEach(function (rockId) {
				rocksOnGround.deactivate(rockId);
			});
		});

		rockDefaultFrame = cc.spriteFrameCache.getSpriteFrame("rock.png");
		rockActivatedFrame = cc.spriteFrameCache.getSpriteFrame("rock_activated.png");
		rockUnavailableFrame = cc.spriteFrameCache.getSpriteFrame("rock_unavailable.png");
	}

	function initializeOnSocketConnect(data) {
		var rocks = data.rocks;
		var activatedRockIds = data.activatedRockIds;

		for (var rockId in rocks) {
			if (rocks.hasOwnProperty(rockId)) {
				var location = sand.globalFunctions.getPositionOnScreenFromGlobalCoordinates(rocks[rockId]);
				rocksOnGround.place(rockId, location);
			}
		}

		activatedRockIds.forEach(function (rockId) {
			rocksOnGround.activate(rockId);
		});

		reservedAreas.addAll(data.reservedAreas);
	}

	function initializeOnLogin(rocks) {
		// initialize rock on player's back, for when rocks are selected
		rockCarriedByPlayerSprite = new cc.Sprite("#rock.png");
		rockCarriedByPlayerSprite.setZOrder(sand.entitiesLayer.zOrders.itemsBeingCarried);
		rockCarriedByPlayerSprite.setVisible(false);
		sand.entitiesLayer.addChild(rockCarriedByPlayerSprite);

		// initialize the four rocks in the player's inventory
		var buttonPosition = sand.inventory.getRockButtonPosition();
		rocks.forEach(function (rock, index) {
			rockIdsOwnedByPlayer.push(rock.id);
			var sprite = new cc.Sprite("#rock.png");
			sprite.setPosition(
				buttonPosition.x + 20 * (index + 1),
				buttonPosition.y + 10);
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
	}

	// modifies selectedRockId
	function wereRocksOnGroundClicked(position) {
		return rockIdsOwnedByPlayer.some(function (rockId) {
			if (rocksOnGround.wasClicked(rockId, position)) {
				selectedRockId = rockId;
				return true;
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
		rocksOnGround.place(selectedRockId, sand.elephants.getPlayerSprite());
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
			points.push(sand.globalFunctions.convertOnScreenPositionToGlobalCoordinates(rocksOnGround.getPosition(rockId)));
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
					sand.globalFunctions.addFootprintToQueue(borderPath[i], sand.brushes.walking.name);
					var j = borderPath.length - 1 - i;
					if (j !== i) {
						sand.globalFunctions.addFootprintToQueue(borderPath[parseInt(borderPath.length - 1 - i)], sand.brushes.walking.name);
					}
				}
			})(i), ((i + 1) / borderPath.length) * 2 * totalDuration));
		}
		footprintTimeouts.push(setTimeout(function () {
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

		rocksOnGround.remove(selectedRockId);

		footprintTimeouts.forEach(function (timeoutId) {
			clearTimeout(timeoutId);
		});

		rockIdsOwnedByPlayer.forEach(function (rockId) {
			rocksOnGround.deactivate(rockId);
		});
	}

	function onRockButtonClicked() {
		sand.elephants.stopPlayerElephant();
		if (isRockSelected) {
			deselectRock();
		} else {
			selectRock();
		}
	}

	function handleTouchEvent(position) {
		if (isRockSelected) {
			sand.elephants.movePlayerElephantToLocation(
				position,
				placeRockOnGround
			);
		} else if (wereRocksOnGroundClicked(position)) {
			sand.elephants.movePlayerElephantToLocation(
				position,
				pickRockUpFromGround
			);
		} else {
			sand.elephants.handleOnTouchEndedEvent(position);
		}
	}

	function mainLoopUpdate() {
		(function updateCarriedSpritePosition() {
			if (isRockSelected) {
				rockCarriedByPlayerSprite.setPosition(
					sand.elephants.getPlayerSprite().x,
					sand.elephants.getPlayerSprite().y + sand.constants.kElephantHeightOffset
				);
			}
		})();
	}

	return {
		initializeOnSceneStart: initializeOnSceneStart,
		initializeOnSocketConnect: initializeOnSocketConnect,
		initializeOnLogin: initializeOnLogin,
		handleTouchEvent: handleTouchEvent,
		onRockButtonClicked: onRockButtonClicked,
		mainLoopUpdate: mainLoopUpdate,
		getScrollableSprites: rocksOnGround.getAllSprites,
		isInsideReservedArea: reservedAreas.containsPoint
	}
})();