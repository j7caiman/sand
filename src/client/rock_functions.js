sand.modifyRegion.createPointsAlongPath = function (path) {
	const spacing = 10;

	var points = [];
	for (var i = 0; i < path.length; i++) {
		var point = path[i];
		var nextPoint = path[(i + 1) % path.length];

		var distance = (function (point1, point2) {
			var xDelta = point2.x - point1.x;
			var yDelta = point2.y - point1.y;
			return {
				x: xDelta,
				y: yDelta,
				h: Math.sqrt((xDelta * xDelta) + (yDelta * yDelta))
			}
		})(point, nextPoint);

		var displacement = {
			x: spacing * (distance.x / distance.h),
			y: spacing * (distance.y / distance.h)
		};

		var k = 0;
		for (var j = 0; j < distance.h; j += spacing) {
			points.push({
				x: point.x + (k * displacement.x),
				y: point.y + (k++ * displacement.y)
			});
		}
	}

	return points;
};

/**
 * uses the gift wrapping algorithm to detect a convex hull
 */
sand.modifyRegion.detectConvexQuadrangle = function (points) {
	if (points.length !== 4) {
		return;
	}

	var leftMost = (function (points) {
		var leftMostPoint = points[0];
		for (var i = 1; i < points.length; i++) {
			if (points[i].x < leftMostPoint.x) {
				leftMostPoint = points[i];
			}
		}
		return leftMostPoint;
	})(points);

	var hull = [];
	var aHullPoint = leftMost;
	do {
		hull.push(aHullPoint);
		aHullPoint = sand.modifyRegion._findNextHullPoint(points, aHullPoint);
	} while (aHullPoint !== leftMost);

	return hull;
};

sand.modifyRegion._findNextHullPoint = function (points, currentHullPoint) {
	// choose a random point that isn't the current one
	var nextHullPoint = points[0] === currentHullPoint ? points[1] : points[0];

	for (var i = 0; i < points.length; i++) {
		if (sand.modifyRegion._formsLeftTurn(currentHullPoint, points[i], nextHullPoint)) {
			nextHullPoint = points[i];
		}
	}

	return nextHullPoint;
};

/**
 * for points p, q, r: returns true if: when traveling from point p to q, r lies to the left.
 */
sand.modifyRegion._formsLeftTurn = function (p, q, r) {
	return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y) < 0;
};