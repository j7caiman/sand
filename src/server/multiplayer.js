module.exports = function(server) {
	var io = require('socket.io')(server);
	var processFootprint = require("./process_footprint");

	var connectedClients = {};
	io.on('connection', function (socket) {
		var currentPlayers = [];
		for (var socketId in connectedClients) {
			if (connectedClients.hasOwnProperty(socketId)) {
				var playerData = connectedClients[socketId];
				currentPlayers.push(playerData);
			}
		}
		socket.emit('onConnect', currentPlayers);

		socket.on('playerData', function (playerData) {
			connectedClients[socket.id] = playerData;
			socket.broadcast.emit('playerData', playerData);
		});

		socket.on('footprint', function (footprintData) {
			socket.broadcast.emit('footprint', footprintData);
			processFootprint(footprintData);
		});

		socket.on('rockPickedUp', function (rockData) {
			socket.broadcast.emit('rockPickedUp', rockData);
		});

		socket.on('rockPutDown', function (rockData) {
			socket.broadcast.emit('rockPutDown', rockData);
		});

		socket.on('disconnect', function () {
			// if the server is restarted while clients are connected, connectedClients will be empty and
			// a client who disconnects will cause this exception
			if (connectedClients[socket.id] !== undefined) {
				io.emit('playerDisconnected', connectedClients[socket.id].uuid);
				delete connectedClients[socket.id];
			}
		});
	});

	return io;
};