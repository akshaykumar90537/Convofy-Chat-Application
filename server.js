const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the "public" directory
app.use(express.static('public'));

// Keep track of active users mapping socket.id -> username
const activeUsers = {};

function broadcastActiveUsers() {
    // Collect all usernames, sorted alphabetically
    const usersList = Object.values(activeUsers).sort((a, b) => a.localeCompare(b));
    io.emit('activeUsers', {
        count: usersList.length,
        users: usersList
    });
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Provide the socket with an initial pseudo-username
    socket.username = 'Anonymous';
    activeUsers[socket.id] = socket.username;
    broadcastActiveUsers();

    // Broadcast a user joined event
    socket.on('joinChat', (username) => {
        socket.username = username || 'Anonymous';
        activeUsers[socket.id] = socket.username;
        broadcastActiveUsers(); // update list with new name

        io.emit('userStatus', {
            type: 'join',
            message: `${socket.username} joined the chat`,
            timestamp: new Date().toISOString(),
        });
    });

    // Listen for incoming chat messages
    socket.on('chatMessage', (msg) => {
        io.emit('chatMessage', {
            username: socket.username,
            text: msg,
            authorId: socket.id,
            timestamp: new Date().toISOString(),
        });
    });

    // Handle typing events
    socket.on('typing', () => {
        socket.broadcast.emit('userTyping', socket.username); // Send to all EXCEPT sender
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('userStoppedTyping', socket.username);
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        const name = socket.username;
        delete activeUsers[socket.id];
        broadcastActiveUsers(); // tell everyone else
        
        io.emit('userStatus', {
            type: 'leave',
            message: `${name} left the chat`,
            timestamp: new Date().toISOString(),
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
