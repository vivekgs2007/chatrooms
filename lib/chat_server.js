var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nameNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
	io = socketio.listen(server);
	io.set('log level', 1);
	io.sockets.on('connection', function (socket) {
		guestNumber = assignGuestName(socket, guestNumber,
		nameNames, namesUsed);
		joinRoom(socket, 'Vivek Chat Room');
		handleMessageBroadcasting(socket, nameNames);
		handleNameChangeAttempts(socket, nameNames, namesUsed);
		handleRoomJoining(socket);
		socket.on('rooms', function() {
			socket.emit('rooms', io.sockets.manager.rooms);
		});
		handleClientDisconnection(socket, nameNames, namesUsed);
	});
};

function assignGuestName(socket, guestNumber, nameNames, namesUsed) {
	var name = 'Guest' + guestNumber;
	nameNames[socket.id] = name;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room) {
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nameNames[socket.id] + ' has joined ' + room + '.'
	});
	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nameNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary});
	}
}

function handleNameChangeAttempts(socket, nameNames, namesUsed) {
	socket.on('nameAttempt', function(name) {
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Names cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(name) == -1) {
				var previousName = nameNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nameNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' is now known as ' + name + '.'
				});
			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
			});
			}
		}
	});
}

function handleMessageBroadcasting(socket) {
	socket.on('message', function (message) {
		socket.broadcast.to(message.room).emit('message', {
				text: nameNames[socket.id] + ': ' + message.text
			});
	});
}

function handleRoomJoining(socket) {
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});
}

function handleClientDisconnection(socket) {
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nameNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nameNames[socket.id];
	});
}




























