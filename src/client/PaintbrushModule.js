sand.paintbrushModule = (function () {
	var opacityLevels = [1, 2, 4, 6];
	var strokeRadiusLevels = [2, 5, 7, 9];

	var currentOpacityLevel;
	var currentStrokeRadius;

	function onOpacityButtonClicked(level) {
		currentOpacityLevel = opacityLevels[level];
	}

	function onStrokeRadiusButtonClicked(level) {
		currentStrokeRadius = strokeRadiusLevels[level];
	}

	function getCurrentPaintbrushData() {
		return {
			opacity: currentOpacityLevel,
			radius: currentStrokeRadius
		}
	}

	return {
		onOpacityButtonClicked: onOpacityButtonClicked,
		onStrokeRadiusButtonClicked: onStrokeRadiusButtonClicked,
		getCurrentPaintbrushData: getCurrentPaintbrushData
	}
})();