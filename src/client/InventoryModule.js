sand.inventory = (function () {
	var inventoryNode;

	var selectedOpacityNode;
	var selectedStrokeRadiusNode;

	var rockButton;
	var opacityButtons;
	var strokeRadiusButtons;

	var inventoryEnabled;

	// constants
	var buttonFillColor = cc.color(229, 229, 229, 255);
	var buttonStrokeColor = cc.color(81, 81, 81, 255);
	var buttonStrokeWidth = 2;

	function initializeOnLogin() {
		inventoryNode = new cc.DrawNode();
		inventoryNode.setPosition(0, 0);
		inventoryNode.setAnchorPoint(0, 0);
		inventoryNode.setZOrder(sand.entitiesLayer.zOrders.inventoryBackground);
		sand.entitiesLayer.addChild(inventoryNode);

		rockButton = cc.rect(20, 20, 100, 20);
		addButton(rockButton);

		opacityButtons = [];
		for (var i = 0; i < 4; i++) {
			var opacityButton = cc.rect(140 + i * 20, 20, 20, 20);
			opacityButtons.push(opacityButton);
			addButton(opacityButton);

			var shadeOfGrey = 81 + (3 - i) * 37;
			inventoryNode.drawDot(
				{x: 150 + i * 20, y: 30},
				7,
				cc.color(shadeOfGrey, shadeOfGrey, shadeOfGrey, 255));
		}

		strokeRadiusButtons = [];
		for (i = 0; i < 4; i++) {
			var strokeRadiusButton = cc.rect(240 + i * 20, 20, 20, 20);
			strokeRadiusButtons.push(strokeRadiusButton);
			addButton(strokeRadiusButton);

			var radius = (i + 2) * 1.5;
			inventoryNode.drawDot(
				{x: 250 + i * 20, y: 30},
				radius,
				cc.color(81, 81, 81, 255));
		}

		selectedOpacityNode = new cc.DrawNode();
		selectedOpacityNode.setPosition(opacityButtons[2]);
		selectedOpacityNode.setAnchorPoint(0, 0);
		selectedOpacityNode.setZOrder(sand.entitiesLayer.zOrders.itemsInInventory);
		selectedOpacityNode.drawRect({x: 0, y: 0}, {x: 20, y: 20}, undefined, 2, cc.color(34, 198, 255, 255));
		sand.entitiesLayer.addChild(selectedOpacityNode);

		selectedStrokeRadiusNode = new cc.DrawNode();
		selectedStrokeRadiusNode.setPosition(strokeRadiusButtons[0]);
		selectedStrokeRadiusNode.setAnchorPoint(0, 0);
		selectedStrokeRadiusNode.setZOrder(sand.entitiesLayer.zOrders.itemsInInventory);
		selectedStrokeRadiusNode.drawRect({x: 0, y: 0}, {x: 20, y: 20}, undefined, 2, cc.color(34, 198, 255, 255));
		sand.entitiesLayer.addChild(selectedStrokeRadiusNode);

		inventoryEnabled = true;
	}

	function addButton(button) {
		inventoryNode.drawRect(
			{x: button.x, y: button.y},
			{x: button.x + button.width, y: button.y + button.height},
			buttonFillColor,
			buttonStrokeWidth,
			buttonStrokeColor
		);
	}


	function getRockButtonPosition() {
		return {x: rockButton.x, y: rockButton.y};
	}

	function handleItemClicked(position, rockCallback, opacityCallback, strokeRadiusCallback, defaultCallback) {
		if (!inventoryEnabled) {
			defaultCallback(position);
			return;
		}

		if (cc.rectContainsPoint(rockButton, position)) {
			rockCallback();
			return;
		}

		for (var i = 0; i < opacityButtons.length; i++) {
			if (cc.rectContainsPoint(opacityButtons[i], position)) {
				selectedOpacityNode.setPosition(opacityButtons[i]);
				opacityCallback(i);
				return;
			}
		}

		for (i = 0; i < strokeRadiusButtons.length; i++) {
			if (cc.rectContainsPoint(strokeRadiusButtons[i], position)) {
				selectedStrokeRadiusNode.setPosition(strokeRadiusButtons[i]);
				strokeRadiusCallback(i);
				return;
			}
		}

		defaultCallback(position);
	}

	return {
		initializeOnLogin: initializeOnLogin,
		handleItemClicked: handleItemClicked,
		getRockButtonPosition: getRockButtonPosition
	};
})();