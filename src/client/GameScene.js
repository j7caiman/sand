/**
 * Contains the update loop that maintains global state.
 * Called once per frame. frame rate is configured in project.json
 */
var GameScene = cc.Scene.extend({
	onEnter:function () {
		this._super();
		this.init();

		sand.elephantLayer = new ElephantLayer();
		sand.backgroundLayer = new BackgroundLayer();
		this.addChild(sand.backgroundLayer);
		this.addChild(sand.elephantLayer);

		this.scheduleUpdate();

		/**
		 * Gives other players' sprites a unique integer.
		 * Necessary because:
		 * The elephant sprite must be removed when another player disconnects from the game.
		 * The only way to remove a sprite is to call removeChildByTag.
		 * Tags must be integers and cannot be strings.
		 */
		sand.cocosTagCounter = 0;
		sand.otherPlayers = {};

		sand.socket = io();
		sand.socket.emit('playerData', {
			uuid: sand.uuid,
			lastPosition: {
				x: Math.round(sand.globalCoordinates.x),
				y: Math.round(sand.globalCoordinates.y)
			}
		});

		function determineOtherPlayerLocation(globalPosition) {
			var localPosition = sand.globalFunctions.toLocalCoordinates(globalPosition);
			var currentViewport = sand.currentRegion.getSprite().getPosition();
			return {
				x: currentViewport.x + localPosition.x,
				y: currentViewport.y + localPosition.y
			};
		}

		function createOrMoveOtherPlayerToLocation(playerData) {
			var location = determineOtherPlayerLocation(playerData.lastPosition);
			if(sand.otherPlayers[playerData.uuid] === undefined) {
				sand.otherPlayers[playerData.uuid] = {
					sprite: sand.elephantLayer.createElephant(location, sand.cocosTagCounter++),
					timeSinceLastCommand: Date.now()
				};
			} else {
				var otherPlayer = sand.otherPlayers[playerData.uuid];
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
				if(!otherPlayer.sprite.getActionByTag("moveElephant")) {
					sand.elephantLayer.moveElephantToLocation(otherPlayer.sprite, location);
				} else {
					var duration = (now - otherPlayer.timeSinceLastCommand) / 1000;
					sand.elephantLayer.moveElephantToLocation(otherPlayer.sprite, location, duration);
				}
				otherPlayer.timeSinceLastCommand = now;
			}
		}

		/**
		 * the onConnect event can happen more than once:
		 * It occurs when the client first connects to the server, and additionally whenever the server is restarted
		 * and all the clients reconnect.
		 */
		sand.socket.on('onConnect', function (currentPlayers) {
			currentPlayers.forEach(function(playerData) {
				createOrMoveOtherPlayerToLocation(playerData);
			});
		});

		sand.socket.on('playerData', function (playerData) {
			createOrMoveOtherPlayerToLocation(playerData);
		});

		sand.socket.on('footprint', function (footprintData) {
			sand.batchedFootprints.push(footprintData);
		});

		sand.socket.on('playerDisconnected', function (uuid) {
			var spriteTag = sand.otherPlayers[uuid].sprite.getTag();
			sand.elephantLayer.removeChildByTag(spriteTag);
			delete sand.otherPlayers[uuid];
		});

		this.positionEmitterThrottler = new this.Throttler(100);
		this.addRegionsThrottler = new this.Throttler(500);
	},

	update: function() {
		this._super();

		var backgroundPosition = sand.currentRegion.getSprite();
		var localPosition = {
			x: sand.elephantLayer.playerSprite.x - backgroundPosition.x,
			y: sand.elephantLayer.playerSprite.y - backgroundPosition.y
		};
		var globalCoordinates = sand.globalFunctions.toGlobalCoordinates(localPosition);
		if (sand.globalCoordinates.x != globalCoordinates.x
		 || sand.globalCoordinates.y != globalCoordinates.y) {

			sand.globalCoordinates = globalCoordinates;

			var printLocation = {
				x: sand.globalCoordinates.x,
				y: sand.globalCoordinates.y + sand.constants.kFootprintVerticalOffset
			};
			if (this._lastPrint === undefined
				|| (sand.globalFunctions.calculateDistance(this._lastPrint, printLocation)
						>= sand.constants.kBrushPathMinimumLineSegmentWidth)) {

				var brush;
				if (sand.isPlayerPainting) {
					brush = "painting";
				} else {
					brush = "walking";
				}

				sand.globalFunctions.addFootprintToQueue(printLocation, brush);
				this._lastPrint = printLocation;
			}

			this.positionEmitterThrottler.throttle(function updateCookiesAndEmitPosition() {
				function equalsWithEpsilon(num1, num2, epsilon) {
					return Math.abs(num1 - num2) < epsilon;
				}

				// don't sent small movements from rounding errors
				var roundedGlobalPosition = {
					x: Math.round(sand.globalCoordinates.x),
					y: Math.round(sand.globalCoordinates.y)
				};

				if (this.lastEmittedPosition === undefined
					|| !equalsWithEpsilon(this.lastEmittedPosition.x, roundedGlobalPosition.x, 1)
					|| !equalsWithEpsilon(this.lastEmittedPosition.y, roundedGlobalPosition.y, 1)) {

					var playerData = {
						uuid: sand.uuid,
						lastPosition: roundedGlobalPosition
					};
					this.lastEmittedPosition = roundedGlobalPosition;

					sand.socket.emit('playerData', playerData);
					$.cookie('playerData', playerData, {expires: 7});
				}
			}, this);

			function isOutOfBounds(position) {
				return position.x > sand.constants.kCanvasWidth
					|| position.y > sand.constants.kCanvasWidth
					|| position.x < 0
					|| position.y < 0;
			}
			if(isOutOfBounds(localPosition)) {
				var differenceInLocation = {
					x: sand.globalFunctions.mod(localPosition.x, sand.constants.kCanvasWidth) - localPosition.x,
					y: sand.globalFunctions.mod(localPosition.y, sand.constants.kCanvasWidth) - localPosition.y
				};

				var newBackgroundPosition = {
					x: backgroundPosition.x - differenceInLocation.x,
					y: backgroundPosition.y - differenceInLocation.y
				};

				var newRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(sand.globalCoordinates);
				sand.currentRegion = sand.allRegions[newRegionName];
				sand.currentRegion.getSprite().setPosition(newBackgroundPosition);
			}

			this.addRegionsThrottler.throttle(sand.globalFunctions.addMoreRegions);

			this.triggerScrolling();
		}

		if(sand.batchedFootprints.length != 0) {
			sand.batchedFootprints.forEach(function(print) {
				var area = sand.globalFunctions.createBoundingBox(
					print.location,
					sand.modifyRegion.brushes[print.brush].radius
				);
				sand.modifyRegion.makeFootprint(area, print.location, print.brush);
			}, this);

			sand.modifyRegion.settle();

			sand.batchedFootprints.forEach(function(print) {
				var area = sand.globalFunctions.createBoundingBox(
					print.location,
					sand.constants.kAffectedRegionWidth / 2
				);
				sand.canvasUpdate.updateHtmlCanvases(area);
			}, this);

			sand.batchedFootprints = [];
		}

		sand.globalFunctions.updateBackgroundSpriteLocations();
	},

	//calls "callback" roughly every 'delayMillis'
	Throttler: function (delayMillis) {
		this.throttle = function(callback, thisArg) {
			this.counter = ++this.counter || 0;
			const frameRate = 24; // configured in project.json
			if (this.counter < (frameRate * delayMillis / 1000)) {
				return;
			}
			this.counter = 0;
			callback.call(thisArg);
		}
	},

	triggerScrolling: function() {
		// if already scrolling, don't attempt to scroll more
		if(sand.elephantLayer.playerSprite.getActionByTag("scroll")) {
			return;
		}

		var elephantPosition = sand.elephantLayer.playerSprite.getPosition();

		var boundary = {
			left: sand.constants.kBeginScrollThreshold,
			right: window.innerWidth - sand.constants.kBeginScrollThreshold,
			bottom: sand.constants.kBeginScrollThreshold,
			top: window.innerHeight - sand.constants.kBeginScrollThreshold
		};

		var beginScrolling = (function (position, boundary) {
			return position.x < boundary.left
				|| position.y < boundary.bottom
				|| position.x > boundary.right
				|| position.y > boundary.top;
		})(elephantPosition, boundary);

		if(beginScrolling) {
			var scrollVector = {
				x: window.innerWidth / 2 - elephantPosition.x,
				y: window.innerHeight / 2 - elephantPosition.y
			};

			var event = new cc.EventCustom("scrollTrigger");
			event.setUserData(scrollVector);
			cc.eventManager.dispatchEvent(event);
		}
	}
});