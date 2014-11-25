sand.level.makeFootprint = function (blankRegionData, centerOfCanvas) {
	sand.level.imprintSphere(blankRegionData, centerOfCanvas, 12);
};

/**
 * crater is shaped as follows:
 *
 *      /\                                      ^
 *     /  \                                    /  ,
 * - -     -                                 -      - ----------
 *          -                              -
 *             ---__              __ --
 *                    ' --------
 *
 * radius: radius of entire element
 * lipHeight: height the crater rises above the ground
 * pointOfImpact: the height at which the sphere which forms the crater is located
 *  - note that in the diagram above, pointOfImpact would be located slightly above the word "follows"
 *
 * TODO: lip has not been created yet
 */
sand.level.imprintSphere = function(regionData, positionOnCanvas, radius) {
	const pointOfImpactZ = 4;

	const sandGrainWidth = sand.constants.kCanvasWidth / sand.constants.kRegionWidth; // blocks are square
	var pointOfImpact = {
		x: Math.floor(positionOnCanvas.x / sandGrainWidth),
		y: Math.floor(positionOnCanvas.y / sandGrainWidth),
		z: pointOfImpactZ
	};

	const regionWidth = sand.constants.kRegionWidth;
	for (var y = 0; y < regionWidth; y++) {
		for (var x = 0; x < regionWidth; x++) {
			var localCoordinates = {
				x: x,
				y: y,
				z: regionData[y][x]
			};

			var delta = {
				x: localCoordinates.x - pointOfImpact.x,
				y: localCoordinates.y - pointOfImpact.y
			};

			// radius = sqrt((x1-x0)^2 + (y1-y0)^2 + (z1-z0)^2)
			// z1     = sqrt(radius^2 - ( (x1-x0)^2 + (y1-y0)^2 )) + z0
			var newZ = -Math.sqrt(radius * radius - ( delta.x * delta.x + delta.y * delta.y )) + pointOfImpact.z;
			if (newZ < 0) {
				regionData[y][x] -= Math.floor(newZ);
			}
		}
	}
};