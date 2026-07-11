"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketManager = void 0;
const socket_io_1 = require("socket.io");
const users = {};
const socketManager = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
        // Join Room
        socket.on('join-room', (roomId, userId, userName) => {
            socket.join(roomId);
            console.log(`User ${userName} (${userId}) joined room ${roomId}`);
            users[socket.id] = { userId, userName, socketId: socket.id };
            // Send existing users in the room to the newly joined user
            const roomClients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
            const existingUsers = roomClients
                .filter((id) => id !== socket.id)
                .map((id) => users[id])
                .filter(Boolean); // safety check
            socket.emit('room-users', existingUsers);
            // Broadcast to others in the room that a user connected
            socket.to(roomId).emit('user-connected', { userId, userName, socketId: socket.id });
            // WebRTC Signaling
            socket.on('offer', ({ to, offer }) => {
                socket.to(to).emit('offer', { from: socket.id, offer });
            });
            socket.on('answer', ({ to, answer }) => {
                socket.to(to).emit('answer', { from: socket.id, answer });
            });
            socket.on('ice-candidate', ({ to, candidate }) => {
                socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
            });
            // File Sharing
            socket.on('file-shared', (fileData) => {
                socket.to(roomId).emit('file-shared', { from: userName, file: fileData });
            });
            // Whiteboard
            socket.on('draw', (drawData) => {
                socket.to(roomId).emit('draw', drawData);
            });
            socket.on('clear-board', () => {
                socket.to(roomId).emit('clear-board');
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`User ${userName} (${userId}) disconnected from room ${roomId}`);
                delete users[socket.id];
                socket.to(roomId).emit('user-disconnected', { userId, socketId: socket.id });
            });
        });
    });
};
exports.socketManager = socketManager;
//# sourceMappingURL=socketManager.js.map