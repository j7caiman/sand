/**
 * The canvas that renders the sand is edited directly, without cocos2d,
 * by manipulating the pixels in the imageData in the canvas DOM element itself.
 *
 * This Layer puts that canvas into a Texture2D, and the texture is then
 * rendered inside a Sprite.
 * It's as close to a wrapper as I could figure out.
 *
 * I couldn't determine an efficient way of doing it with only cocos2d calls,
 * since calling drawRect() 30,000 times was taking too long, and I couldn't can't find
 * a way to edit the pixels with cocos2d directly.
 *
 */
var SandLayer = cc.Layer.extend({
	ctor: function () {
		this._super();
		this.init();
	},

	init: function () {
		this._super();

		this.canvasTextureToDrawFrom = new cc.Texture2D();
		var sprite = new cc.Sprite(this.canvasTextureToDrawFrom);

		/**
		 * coordinates start at the center of the sprite, which is the size of the html canvas
		 */
		sprite.attr({
			x: sand.constants.kCanvasWidth / 2,
			y: sand.constants.kCanvasWidth / 2
		});

		this.addChild(sprite);
	},

	canvasTextureToDrawFrom: {}
});