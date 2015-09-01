var sand = sand || {};
var require = require || function () {};
sand.globalFunctions = sand.globalFunctions || require("./../shared/global_functions");
sand.constants = sand.constants || require("./../shared/global_constants");

sand.modifyRegion = sand.modifyRegion || {};

var kMaxRockEdgeWidth = 1000;
var kMaxRockArea = kMaxRockEdgeWidth * kMaxRockEdgeWidth;

sand.modifyRegion.getReservedPerimeterIfValid = function (points) {
	var path = sand.modifyRegion.detectConvexQuadrangle(points);

	for (var i = 0; i < path.length; i++) {
		var distance = sand.globalFunctions.calculateDistance(path[i], path[(i + 1) % path.length]);
		if (distance > kMaxRockEdgeWidth) {
			return false;
		}
	}

	var area = _getPolygonArea(path);
	if (area > kMaxRockArea) {
		return false;
	}

	return path;
};

/**
 * given the counterclockwise path of a polygon, returns the area of that polygon.
 */
function _getPolygonArea(path) {
	var area = 0;
	for (var i = 0, j = path.length - 1; i < path.length; j = i++) {
		area += (path[j].x + path[i].x) * (path[j].y - path[i].y);
	}
	return -area / 2;
}



sand.modifyRegion.pointInsidePolygon = function(vertex, path) {
	var inside = false;
	for (var i = 0, j = path.length - 1; i < path.length; j = i++) {
		var intersect = ((path[i].y > vertex.y) != (path[j].y > vertex.y))
			&& (vertex.x < (path[j].x - path[i].x) * (vertex.y - path[i].y) / (path[j].y - path[i].y) + path[i].x);

		if (intersect) {
			inside = !inside;
		}
	}

	return inside;
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
		aHullPoint = _findNextHullPoint(points, aHullPoint);
	} while (aHullPoint !== leftMost);

	return hull;
};

function _findNextHullPoint(points, currentHullPoint) {
	// choose a random point that isn't the current one
	var nextHullPoint = points[0] === currentHullPoint ? points[1] : points[0];

	for (var i = 0; i < points.length; i++) {
		if (_formsLeftTurn(currentHullPoint, points[i], nextHullPoint)) {
			nextHullPoint = points[i];
		}
	}

	return nextHullPoint;
}

/**
 * for points p, q, r: returns true if: when traveling from point p to q, r lies to the left.
 */
function _formsLeftTurn(p, q, r) {
	return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y) < 0;
}


var module = module || {};
module.exports = sand.modifyRegion;