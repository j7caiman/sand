function _getPolygonArea(path) {
	var area = 0;
	var j = path.length - 1;
	for (var i = 0; i < path.length; i++) {
		area += (path.x[j] + path.x[i]) * (path.y[j] - path.y[i]);
		j = i;
	}
	return area / 2;
}