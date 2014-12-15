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

		sand.socket = io();
		sand.socket.emit('playerData', {
			uuid: sand.uuid,
			lastPosition: sand.globalCoordinates
		});

		function determineOtherPlayerLocation(globalPosition) {
			var localPosition = sand.globalFunctions.toLocalCoordinates(globalPosition);
			var currentViewport = sand.currentRegion.getSprite().getPosition();
			return {
				x: currentViewport.x + localPosition.x,
				y: currentViewport.y + localPosition.y
			};
		}

		sand.socket.on('onConnect', function (currentPlayers) {
			sand.otherPlayers = {};
			/**
			 * tags cannot be strings, and 'removeChildByName' is not in the API, so in order to remove players once
			 * they disconnect, they must have a reference which is a unique integer.
			 */
			sand.cocosTagCounter = 0;

			currentPlayers.forEach(function(playerData) {
				var location = determineOtherPlayerLocation(playerData.lastPosition);
				sand.otherPlayers[playerData.uuid] =  {
					sprite: sand.elephantLayer.createElephant(location, sand.cocosTagCounter++),
					timeSinceLastCommand: Date.now()
				};
			});
		});

		sand.socket.on('playerData', function (playerData) {
			var location = determineOtherPlayerLocation(playerData.lastPosition);
			if(sand.otherPlayers[playerData.uuid] === undefined) {
				sand.otherPlayers[playerData.uuid] =  {
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
					sand.elephantLayer.moveElephant(otherPlayer.sprite, location);
				} else {
					var duration = (now - otherPlayer.timeSinceLastCommand) / 1000;
					sand.elephantLayer.moveElephant(otherPlayer.sprite, location, duration);
				}
				otherPlayer.timeSinceLastCommand = now;
			}
		});

		sand.socket.on('footprint', function (footprintData) {
			sand.batchedFootprints.push(footprintData);
		});

		sand.socket.on('playerDisconnected', function (uuid) {
			var spriteTag = sand.otherPlayers[uuid].sprite.getTag();
			sand.elephantLayer.removeChildByTag(spriteTag);
			delete sand.otherPlayers[uuid];
		});

		this.cookiesThrottler = new this.Throttler(100);
		this.savePlayerThrottler = new this.Throttler(1000);
		this.addRegionsThrottler = new this.Throttler(500);
	},

	update: function() {
		this._super();

		var backgroundPosition = sand.currentRegion.getSprite();
		var positionOnCurrentRegionCanvas = {
			x: sand.elephantLayer.playerSprite.x - backgroundPosition.x,
			y: (sand.elephantLayer.playerSprite.y - sand.elephantLayer.playerSprite.width / 4) - backgroundPosition.y // slightly offset footprints from player
		};
		var globalCoordinates = sand.globalFunctions.toGlobalCoordinates(positionOnCurrentRegionCanvas);
		if (sand.globalCoordinates.x != globalCoordinates.x
		 || sand.globalCoordinates.y != globalCoordinates.y) {

			sand.globalCoordinates = globalCoordinates;

			this.cookiesThrottler.throttle(function updateCookiesAndEmitPosition() {
				var playerData = {
					uuid: sand.uuid,
					lastPosition: sand.globalCoordinates
				};
				sand.socket.emit('playerData', playerData);
				$.cookie('playerData', playerData, {expires: 7});
			}, this);

			this.savePlayerThrottler.throttle(this.savePlayerAndLevel, this);

			function isOutOfBounds(position) {
				return position.x > sand.constants.kCanvasWidth
					|| position.y > sand.constants.kCanvasWidth
					|| position.x < 0
					|| position.y < 0;
			}
			if(isOutOfBounds(positionOnCurrentRegionCanvas)) {
				function mod(n, mod) { return ((mod % n) + n) % n; }
				var differenceInLocation = {
					x: mod(sand.constants.kCanvasWidth, positionOnCurrentRegionCanvas.x) - positionOnCurrentRegionCanvas.x,
					y: mod(sand.constants.kCanvasWidth, positionOnCurrentRegionCanvas.y) - positionOnCurrentRegionCanvas.y
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
			function determineAffectedArea(position) {
				return {
					x: position.x - sand.constants.kAffectedRegionWidth / 2,
					y: position.y - sand.constants.kAffectedRegionWidth / 2,
					width: sand.constants.kAffectedRegionWidth,
					height: (sand.constants.kAffectedRegionWidth)
				};
			}

			sand.batchedFootprints.forEach(function(printLocation) {
				var area = determineAffectedArea(printLocation);
				sand.modifyRegion.makeFootprint(area, printLocation);
			});

			sand.modifyRegion.settle();

			sand.batchedFootprints.forEach(function(printLocation) {
				var area = determineAffectedArea(printLocation);
				sand.canvasUpdate.updateHtmlCanvases(area);
			});

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
			right: sand.constants.kViewportWidth - sand.constants.kBeginScrollThreshold,
			bottom: sand.constants.kBeginScrollThreshold,
			top: sand.constants.kViewportHeight - sand.constants.kBeginScrollThreshold
		};

		var beginScrolling = (function (position, boundary) {
			return position.x < boundary.left
				|| position.y < boundary.bottom
				|| position.x > boundary.right
				|| position.y > boundary.top;
		})(elephantPosition, boundary);

		if(beginScrolling) {
			var scrollVector = {
				x: sand.constants.kViewportWidth / 2 - elephantPosition.x,
				y: sand.constants.kViewportHeight / 2 - elephantPosition.y
			};

			var event = new cc.EventCustom("scrollTrigger");
			event.setUserData(scrollVector);
			cc.eventManager.dispatchEvent(event);
		}
	},

	savePlayerAndLevel: function () {
		var data = {
			regionData: sand.currentRegion.getData(),
			regionCoordinates: {
				x: sand.currentRegion.x,
				y: sand.currentRegion.y
			}
		};

		$.ajax({
			url: "write_to_region",
			type: "POST",
			data: JSON.stringify(data),
			contentType: "application/json"
		});
	}
});