sand.traveller = (function () {
	var travellerSprite;
	var speechBubbleSprite;
	var speechBox;

	// state variables
	var walkAimlesslyEnabled = true;
	var isWalking = false;
	var eastOrWest = 1;
	var chosenGift;

	// constants
	var walkSpeed = 30;
	var intervalMillis = 1000;
	var minWaitTimeMillis = 5000, maxWaitTimeMillis = 60000;
	var minDistance = 10, maxDistance = 70;
	var speechBubbleOffset = {
		x: -5,
		y: 35
	};
	var speechBubbleVisibleDistance = 140;
	var openSpeechBoxDistance = 80;
	var speechBoxOffset = {
		x: -20,
		y: -40
	};
	var gifts = {
		nothing: "nothing",
		shovel: "shovel",
		paintbrush: "paintbrush"
	};

	function initialize() {
		(function initializeTraveller() {
			travellerSprite = new cc.Sprite("#traveller.png");
			travellerSprite.setPosition({
				x: sand.elephants.getPlayerSprite().getPositionX() + 100,
				y: sand.elephants.getPlayerSprite().getPositionY() + 50
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
			speechBubbleSprite.setVisible(false);

			sand.entitiesLayer.addChild(speechBubbleSprite);
		})();

		speechBox = $('#travellerSpeechBox');

		$('.shovelButton').click(function () {
			$('.travellerSpeechOptions').hide();
			$('#shovelChosenText').show();
			chosenGift = gifts.shovel;

		});

		$('.paintbrushButton').click(function () {
			$('.travellerSpeechOptions').hide();
			$('#paintbrushChosenText').show();
			chosenGift = gifts.paintbrush;
		});

		chosenGift = gifts.nothing;
	}

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}

	function walkEastOrWest() {
		if (!walkAimlesslyEnabled) {
			return;
		}

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

		setTimeout(walkEastOrWest, getRandomInt(minWaitTimeMillis, maxWaitTimeMillis));
	}

	function updateSpeechBubble(distanceFromPlayer) {
		speechBubbleSprite.setPosition({
			x: travellerSprite.getPositionX() + speechBubbleOffset.x,
			y: travellerSprite.getPositionY() + speechBubbleOffset.y
		});

		speechBubbleSprite.setVisible(
			(distanceFromPlayer < speechBubbleVisibleDistance)
			&& (distanceFromPlayer >= openSpeechBoxDistance)
		);
	}

	function updateSpeechBox(distanceFromPlayer) {
		if (distanceFromPlayer > openSpeechBoxDistance) {
			speechBox.hide();
		} else if (!speechBox.is(':visible')) {
			$('.travellerSpeechOptions').hide();
			if (chosenGift === gifts.nothing) {
				$('#welcomeText').show();
			} else {
				$('#welcomeBackText').show();
			}

			speechBox.show();
		}

		var position = travellerSprite.getPosition();
		position.y = window.innerHeight - position.y; // cocos2d y coordinates are inverted relative to HTML coordinates

		position.x += speechBoxOffset.x;
		position.y += speechBoxOffset.y - speechBox.height();

		if (speechBox.width() + position.x > window.innerWidth) {
			position.x = window.innerWidth - speechBox.width();
		} else if (position.x < 0) {
			position.x = 0;
		}

		if (speechBox.height() + position.y > window.innerHeight) {
			position.y = window.innerHeight - speechBox.height();
		} else if (position.y < 0) {
			position.y = 0;
		}

		speechBox.css({
			left: position.x,
			top: position.y
		});
	}

	function mainLoopUpdate() {
		var approximateDistanceFromPlayer =
			Math.abs(travellerSprite.getPositionX() - sand.elephants.getPlayerSprite().getPositionX())
			+ Math.abs(travellerSprite.getPositionY() - sand.elephants.getPlayerSprite().getPositionY());

		walkAimlesslyEnabled = approximateDistanceFromPlayer > speechBubbleVisibleDistance;

		updateSpeechBubble(approximateDistanceFromPlayer);

		updateSpeechBox(approximateDistanceFromPlayer);
	}

	function getTravellerSprite() {
		return travellerSprite;
	}

	function wasPaintbrushChosen() {
		return chosenGift === gifts.paintbrush;
	}

	function wasShovelChosen() {
		return chosenGift === gifts.shovel;
	}

	return {
		initialize: initialize,
		mainLoopUpdate: mainLoopUpdate,
		getTravellerSprite: getTravellerSprite,
		wasPaintbrushChosen: wasPaintbrushChosen,
		wasShovelChosen: wasShovelChosen
	};
})();