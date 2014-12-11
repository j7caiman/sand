/**
 * Contains the update loop that maintains global state.
 * Called once per frame.
 */
var GameScene = cc.Scene.extend({
	onEnter:function () {
		this._super();
		this.init();

		var playerLayer = new PlayerLayer();
		sand.player.sprite = playerLayer.player;
		var backgroundLayer = new BackgroundLayer();
		sand.backgroundLayer = backgroundLayer;
		this.addChild(backgroundLayer);
		this.addChild(playerLayer);

		this.scheduleUpdate();
	},

	update: function() {
		this._super();

		var backgroundPosition = sand.currentRegion.getSprite();
		var positionOnCanvas = {
			x: sand.player.sprite.x - backgroundPosition.x,
			y: (sand.player.sprite.y - sand.player.sprite.width / 4) - backgroundPosition.y // slightly offset footprints from player
		};

		var globalCoordinates = sand.globalFunctions.toGlobalCoordinates(positionOnCanvas);
		if(!(sand.player.globalCoordinates.x == globalCoordinates.x
			&& sand.player.globalCoordinates.y == globalCoordinates.y)) {

			this.savePlayerAndLevel(sand.player.globalCoordinates, sand.currentRegion);
		}
		sand.player.globalCoordinates = globalCoordinates;

		function isOutOfBounds(position) {
			return position.x > sand.constants.kCanvasWidth
				|| position.y > sand.constants.kCanvasWidth
				|| position.x < 0
				|| position.y < 0;
		}
		if(isOutOfBounds(positionOnCanvas)) {
			function mod(n, mod) { return ((mod % n) + n) % n; }
			var differenceInLocation = {
				x: mod(sand.constants.kCanvasWidth, positionOnCanvas.x) - positionOnCanvas.x,
				y: mod(sand.constants.kCanvasWidth, positionOnCanvas.y) - positionOnCanvas.y
			};

			var newBackgroundPosition = {
				x: backgroundPosition.x - differenceInLocation.x,
				y: backgroundPosition.y - differenceInLocation.y
			};

			var newRegionName = sand.globalFunctions.findRegionNameFromAbsolutePosition(sand.player.globalCoordinates);
			sand.currentRegion = sand.allRegions[newRegionName];
			sand.backgroundLayer.initializeSpriteLocations(newBackgroundPosition);
		}

		sand.globalFunctions.addMoreRegions(function() {
			sand.backgroundLayer.initializeSpriteLocations(sand.currentRegion.getSprite().getPosition());
		});
	},

	savePlayerAndLevel: function (globalPosition, region) {
		this.savePlayerAndLevel.counter = ++ this.savePlayerAndLevel.counter || 0;
		if (this.savePlayerAndLevel.counter < 60) {
			return;
		}
		this.savePlayerAndLevel.counter = 0;

		$.cookie('lastPosition', globalPosition, {expires: 7});

		var data = {
			regionData: region.getData(),
			regionCoordinates: {
				x: region.x,
				y: region.y
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