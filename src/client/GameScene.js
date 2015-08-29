/**
 * Contains the update loop that maintains global state.
 * Called once per frame. frame rate is configured in project.json
 */
var GameScene = cc.Scene.extend({
	onEnter:function () {
		this._super();
		this.init();

		cc.spriteFrameCache.addSpriteFrames(resources.ui_sprite_plist);
		cc.spriteFrameCache.addSpriteFrames(resources.traveller_sprite_plist);
		cc.spriteFrameCache.addSpriteFrames(resources.elephant_sprite_plist);

		sand.backgroundLayer = new BackgroundLayer();
		sand.entitiesLayer = new EntitiesLayer();

		this.addChild(sand.backgroundLayer);
		this.addChild(sand.entitiesLayer);

		$('#loading').hide();
		$('#signIn').show();
		if(typeof userRemembered === 'function') {
			userRemembered();
		}

		/**
		 * Gives other players' sprites a unique integer.
		 * Necessary because:
		 * The elephant sprite must be removed when another player disconnects from the game.
		 * The only way to remove a sprite is to call removeChildByTag.
		 * Tags must be integers and cannot be strings.
		 */
		sand.cocosTagCounter = 0;

		sand.socket = io({
			query: 'uuid=' + sand.uuid
			+ '&x=' + Math.round(sand.globalCoordinates.x)
			+ '&y=' + Math.round(sand.globalCoordinates.y)
		});

		sand.elephants.initializeOnSceneStart();
		sand.reserveAreasModule.initializeOnSceneStart();
		sand.traveller.initialize();

		/**
		 * the onConnect event can happen more than once:
		 * It occurs when the client first connects to the server, and additionally whenever the server is restarted
		 * and all the clients have to reconnect.
		 */
		sand.socket.on('onConnect', function (data) {
			sand.elephants.initializeOnSocketConnect(data.players);
			sand.reserveAreasModule.initializeOnSocketConnect(data.reservedAreaData);
		});

		sand.socket.on('footprint', function (footprintData) {
			sand.batchedFootprints.push(footprintData);
		});

		this.positionEmitterThrottler = new this.Throttler(100);
		this.addRegionsThrottler = new this.Throttler(500);

		this.scheduleUpdate();
	},

	update: function() {
		this._super();

		var backgroundPosition = sand.currentRegion.getSprite();
		var localPosition = {
			x: sand.elephants.getPlayerSprite().x - backgroundPosition.x,
			y: sand.elephants.getPlayerSprite().y - backgroundPosition.y
		};
		var globalCoordinates = sand.globalFunctions.toGlobalCoordinates(localPosition);
		if (sand.globalCoordinates.x != globalCoordinates.x
		 || sand.globalCoordinates.y != globalCoordinates.y) {

			sand.globalCoordinates = globalCoordinates;

			var brush = sand.elephants.getPlayerBrushWhileMoving();
			var frequency = sand.modifyRegion.brushes[brush].frequency;
			var printLocation = {
				x: sand.globalCoordinates.x,
				y: sand.globalCoordinates.y
			};
			if (this._lastPrint === undefined
				|| (sand.globalFunctions.calculateDistance(this._lastPrint, printLocation) >= frequency)) {

				if (!sand.flying) {
					sand.globalFunctions.addFootprintToQueue(printLocation, brush);
				}

				this._lastPrint = printLocation;
			}

			if(!sand.flying) {
				this.positionEmitterThrottler.throttle(function updateCookiesAndEmitPosition() {
					function equalsWithEpsilon(num1, num2, epsilon) {
						return Math.abs(num1 - num2) < epsilon;
					}

					// don't send small movements from rounding errors
					var roundedGlobalPosition = {
						x: Math.round(sand.globalCoordinates.x),
						y: Math.round(sand.globalCoordinates.y)
					};

					if (this.lastEmittedPosition === undefined
						|| !equalsWithEpsilon(this.lastEmittedPosition.x, roundedGlobalPosition.x, 1)
						|| !equalsWithEpsilon(this.lastEmittedPosition.y, roundedGlobalPosition.y, 1)) {

						this.lastEmittedPosition = roundedGlobalPosition;

						sand.socket.emit('updatePosition', {
							uuid: sand.uuid,
							position: roundedGlobalPosition
						});

						$.cookie('playerData', {
							uuid: sand.uuid,
							lastPosition: roundedGlobalPosition
						}, {expires: 7});
					}
				}, this);
			}

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
				sand.modifyRegion.makeFootprint(print.location, print.brush);

				var area = sand.globalFunctions.createBoundingBox(
					print.location,
					sand.constants.kAffectedRegionWidth / 2
				);
				sand.canvasUpdate.updateHtmlCanvases(area);
			}, this);

			sand.batchedFootprints = [];
		}

		sand.reserveAreasModule.mainLoopUpdate();
		sand.traveller.mainLoopUpdate();

		this.updateBackgroundSpriteLocations();
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
		if(sand.elephants.getPlayerSprite().getActionByTag("scroll")) {
			return;
		}

		var elephantPosition = sand.elephants.getPlayerSprite().getPosition();

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
	},

	updateBackgroundSpriteLocations: function() {
		var playerScreenPosition = sand.elephants.getPlayerSprite().getPosition();
		var bottomLeftCornerOfViewport = {
			x:  sand.globalCoordinates.x - playerScreenPosition.x,
			y:  sand.globalCoordinates.y - playerScreenPosition.y
		};

		var viewport = {
			x: bottomLeftCornerOfViewport.x,
			y: bottomLeftCornerOfViewport.y,
			width: window.innerWidth,
			height: window.innerHeight
		};
		var visibleRegionNames = sand.globalFunctions.findRegionsInRect(viewport);

		var indexOfCurrentRegion = undefined;
		var previousRegionYCoordinate;
		var numColumns;
		visibleRegionNames.forEach(function(regionName, index) {
			if(sand.currentRegion.getName() === regionName) {
				indexOfCurrentRegion = index;
			}
			var yCoordinate = regionName.split("_")[1];
			if(numColumns === undefined && index !== 0 && yCoordinate !== previousRegionYCoordinate) {
				numColumns = index;
			}

			previousRegionYCoordinate = yCoordinate;
		});
		if(numColumns === undefined) {
			numColumns = 1;
		}

		var currentRegionOffset = {
			x: indexOfCurrentRegion % numColumns,
			y: Math.floor(indexOfCurrentRegion / numColumns)
		};
		var currentRegionLocation = sand.currentRegion.getSprite().getPosition();

		visibleRegionNames.forEach(function(regionName, index) {
			var region = sand.allRegions[regionName];
			if(region !== undefined) {
				var sprite = region.getSprite();

				var regionOffset = {
					x: index % numColumns,
					y: Math.floor(index / numColumns)
				};

				const epsilon = 1; // slightly overlap regions so that safari and firefox tears between regions are invisible
				var x = currentRegionLocation.x - (sand.constants.kCanvasWidth - epsilon) * (currentRegionOffset.x - regionOffset.x);
				var y = currentRegionLocation.y - (sand.constants.kCanvasWidth - epsilon) * (currentRegionOffset.y - regionOffset.y);
				sprite.setPosition(x, y);
				sprite.setVisible(true);
			}
		});
	}
});