sand.traveller = (function () {
	var travellerSprite;
	var speechBubbleSprite;

	// state variables
	var isWalking = false;
	var eastOrWest = 1;

	// constants
	var walkSpeed = 30;
	var intervalMillis = 1000;
	var minWaitTimeMillis = 5000, maxWaitTimeMillis = 60000;
	var minDistance = 10, maxDistance = 70;
	var speechBubbleOffset = {
		x: -5,
		y: 35
	};
	var speechBubbleVisibleRange = 140;

	function initialize() {
		(function initializeTraveller() {
			travellerSprite = new cc.Sprite("#traveller.png");
			travellerSprite.setPosition({
				x: sand.entitiesLayer.playerSprite.getPositionX() + 300,
				y: sand.entitiesLayer.playerSprite.getPositionY() + 150
			});
			travellerSprite.setZOrder(sand.entitiesLayer.zOrders.traveller);

			sand.entitiesLayer.addChild(travellerSprite);

			setInterval(walkAimlessly, intervalMillis);
		})();

		(function initializeSpeechBubble() {
			speechBubbleSprite = new cc.Sprite("#speech_bubble.png");
			speechBubbleSprite.setPosition({
				x: travellerSprite.getPositionX() + speechBubbleOffset.x,
				y: travellerSprite.getPositionY() + speechBubbleOffset.y
			});
			speechBubbleSprite.setZOrder(sand.entitiesLayer.zOrders.traveller);
			//speechBubbleSprite.setVisible(false);

			sand.entitiesLayer.addChild(speechBubbleSprite);
		})();
	}

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}

	function walkRandomly() {
		var distance = getRandomInt(minDistance, maxDistance);
		var duration = distance / walkSpeed;

		eastOrWest === 1 ? travellerSprite.setFlippedX(false) : travellerSprite.setFlippedX(true);

		var moveAction = cc.sequence(
			cc.moveBy(duration, {x: distance * eastOrWest, y: 0}),
			cc.callFunc(function () {
				eastOrWest *= -1;
				isWalking = false;
			})
		);

		travellerSprite.runAction(moveAction)
	}

	function walkAimlessly() {
		if (isWalking) {
			return;
		}
		isWalking = true;

		setTimeout(walkRandomly, getRandomInt(minWaitTimeMillis, maxWaitTimeMillis));
	}

	function mainLoopUpdate() {
		(function updateSpeechBubble() {
			speechBubbleSprite.setPosition({
				x: travellerSprite.getPositionX() + speechBubbleOffset.x,
				y: travellerSprite.getPositionY() + speechBubbleOffset.y
			});

			var taxicabDistanceBetweenPlayerAndTraveller =
				Math.abs(travellerSprite.getPositionX() - sand.entitiesLayer.playerSprite.getPositionX())
				+ Math.abs(travellerSprite.getPositionY() - sand.entitiesLayer.playerSprite.getPositionY());

			speechBubbleSprite.setVisible(taxicabDistanceBetweenPlayerAndTraveller < speechBubbleVisibleRange);
		})();
	}

	function getTravellerSprite() {
		return travellerSprite;
	}

	return {
		initialize: initialize,
		mainLoopUpdate: mainLoopUpdate,
		getTravellerSprite: getTravellerSprite
	}
})();