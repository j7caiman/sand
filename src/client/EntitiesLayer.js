/**
 * Contains all the entities that move around (the player, the traveller, other players, rocks).
 * These are added to this layer by other classes.
 */
var EntitiesLayer = cc.Layer.extend({
	ctor: function () {
		this._super();
		this.init();
	},

	zOrders: {
		itemsInInventory: 4,
		inventoryBackground: 3,
		shovelingAnimation: 2,
		itemsBeingCarried: 1,
		playerElephant: 0,
		traveller: -1,
		otherElephants: -2,
		itemsOnGround: -3
	},

	init: function () {
		this._super();

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
				sand.elephants.handleOnTouchBeganEvent(position);
			},

			onTouchesMoved: function (touches) {
				var position = touches[0].getLocation();
				sand.elephants.handleOnTouchMovedEvent(position);
			},

			onTouchesEnded: function (touches) {
				var position = touches[0].getLocation();

				sand.inventory.handleItemClicked(
					position,
					sand.reserveAreasModule.onRockButtonClicked,
					sand.paintbrushModule.onOpacityButtonClicked,
					sand.paintbrushModule.onStrokeRadiusButtonClicked,
					sand.reserveAreasModule.handleTouchEvent
				);
			}
		}, this);
	}
});