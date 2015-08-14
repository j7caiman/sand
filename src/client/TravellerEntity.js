sand.traveller = (function () {
	var sprite;

	// aimless walking state variables
	var walkSpeed = 30;
	var intervalMillis = 1000;
	var minWaitTimeMillis = 5000, maxWaitTimeMillis = 60000;
	var minDistance = 10, maxDistance = 70;
	var isWalking = false;
	var eastOrWest = 1;

	function initialize() {
		sprite = new cc.Sprite("#traveller.png");
		sprite.setPosition({
			x: sand.entitiesLayer.playerSprite.getPositionX() + 300,
			y: sand.entitiesLayer.playerSprite.getPositionY() + 150
		});
		sprite.setZOrder(sand.entitiesLayer.zOrders.traveller);

		sand.entitiesLayer.addChild(sprite);

		setInterval(walkAimlessly, intervalMillis);
	}

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}

	function walkRandomly() {
		var distance = getRandomInt(minDistance, maxDistance);
		var duration = distance / walkSpeed;

		eastOrWest === 1 ? sprite.setFlippedX(false) : sprite.setFlippedX(true);

		var moveAction = cc.sequence(
			cc.moveBy(duration, {x: distance * eastOrWest, y: 0}),
			cc.callFunc(function () {
				eastOrWest *= -1;
				isWalking = false;
			})
		);

		sprite.runAction(moveAction)
	}

	function walkAimlessly() {
		if (isWalking) {
			return;
		}
		isWalking = true;

		setTimeout(walkRandomly, getRandomInt(minWaitTimeMillis, maxWaitTimeMillis));
	}

	return {
		initialize: initialize
	}
})();