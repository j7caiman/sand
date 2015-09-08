var debug = require('debug')('sand');

var caches = require('./caches');
var processFootprint = require('./process_footprint');
var buriedItems = require('./buried_items');

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
				reservedAreaData: {
					rocks: caches.getRocksOnGround(),
					activatedRockIds: caches.getActivatedRockIds(),
					reservedAreas: caches.getReservedAreas()
				}
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
				caches.rockPickedUpUpdate(data.uuid, data.rockId, function (reservedAreaId, rockIds) {
					socket.broadcast.emit('rockPickedUp', {
						rockId: data.rockId
					});

					if (reservedAreaId !== undefined && rockIds !== undefined) {
						io.emit('areaRemoved', {
							reservedAreaId: reservedAreaId,
							deactivatedRockIds: rockIds
						});
					}
				});
			});

			socket.on('rockPutDown', function (data) {
				caches.rockPutDownUpdate(data.uuid, data.rockId, data.position, function () {
					socket.broadcast.emit('rockPutDown', {
						rockId: data.rockId,
						position: data.position
					});
				});
			});

			socket.on('reserveArea', function (data) {
				caches.addReservedArea(data.uuid, function (reservedAreaId, path, rockIds) {
					io.emit('areaReserved', {
						reservedAreaId: reservedAreaId,
						path: path,
						rockIds: rockIds
					});
				})
			});

			socket.on('digUpItem', function (data) {
				if (caches.isUuidValid(data.uuid)) {
					var itemText = buriedItems.getBuriedItem();
					if(itemText !== undefined) {
						socket.emit('itemFound', {
							itemText: itemText
						});
					}
				}
			})
		});
	}
};