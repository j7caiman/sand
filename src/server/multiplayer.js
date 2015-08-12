var debug = require('debug')('sand');
var processFootprint = require('./process_footprint');
var caches = require('./caches');

exports.initMultiplayer = function (server) {
	caches.initialize(onCacheInitializationComplete);

	function onCacheInitializationComplete() {
		var io = require('socket.io')(server);

		io.use(function (socket, next) {
			var uuid = socket.handshake.query.uuid;
			var position = {
				x: socket.handshake.query.x,
				y: socket.handshake.query.y
			};

			caches.addOrUpdatePlayer(uuid, position);
			socket.broadcast.emit('playerMoved', {
				uuid: uuid,
				position: position
			});
			next();
		});

		io.on('connection', function (socket) {
			socket.emit('onConnect', {
				players: caches.getCurrentPlayers(),
				rocks: caches.getRocksOnGround(),
				reservedAreas: caches.getReservedAreas()
			});

			socket.on('updatePosition', function (data) {
				caches.addOrUpdatePlayer(data.uuid, data.position);
				socket.broadcast.emit('playerMoved', data);
			});

			socket.on('disconnect', function () {
				caches.removePlayer(socket.handshake.query.uuid);
				io.emit('playerDisconnected', socket.handshake.query.uuid);
			});

			socket.on('footprint', function (footprintData) {
				socket.broadcast.emit('footprint', footprintData);
				processFootprint(footprintData);
			});

			socket.on('rockPickedUp', function (data) {
				caches.rockPickedUpUpdate(data, function (areaId, rockIds) {
					var dataToEmit = {rockId: data.id};
					if (areaId !== undefined && rockIds !== undefined) {
						dataToEmit.areaId = data.uuid;
						dataToEmit.deactiveatedRockIds = rockIds;
					}
					socket.broadcast.emit('rockPickedUp', dataToEmit);
				});
			});

			socket.on('rockPutDown', function (data) {
				caches.rockPutDownUpdate(data, function () {
					socket.broadcast.emit('rockPutDown', data);
				});
			});

			socket.on('reserveArea', function (data) {
				caches.addReservedArea(data.uuid, function (path, rockIds) {
					socket.broadcast.emit('areaReserved', {
						areaId: data.uuid,
						path: path,
						rockIds: rockIds
					});
				})
			})
		});
	}
};