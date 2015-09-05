sand.paintbrushModule = (function () {
	var currentOpacityLevel = 4;
	var currentStrokeRadius = 2;

	function onOpacityButtonClicked(level) {
		if(level === 0) {
			currentOpacityLevel = 1;
		} else if(level === 1) {
			currentOpacityLevel = 2;
		} else if(level === 2) {
			currentOpacityLevel = 4;
		} else if(level === 3) {
			currentOpacityLevel = 6;
		}
	}

	function onStrokeRadiusButtonClicked(level) {
		if(level === 0) {
			currentStrokeRadius = 2;
		} else if(level === 1) {
			currentStrokeRadius = 5;
		} else if(level === 2) {
			currentStrokeRadius = 7;
		} else if(level === 3) {
			currentStrokeRadius = 9;
		}
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