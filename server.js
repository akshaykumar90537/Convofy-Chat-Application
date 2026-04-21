require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');

// Setup for uploads directory
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json()); // To parse JSON request bodies
// Serve static files from the "public" directory
app.use(express.static('public'));

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/convofy';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

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

// REST API Endpoints for Authentication

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully', username });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Keep it simple: on success, client can proceed to connect socket
        res.status(200).json({ message: 'Login successful', username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// File Upload
app.post('/api/upload', upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Determine type based on mimetype
    const mime = req.file.mimetype;
    let mediaType = 'unknown';
    if (mime.startsWith('image/')) mediaType = 'image';
    if (mime.startsWith('video/')) mediaType = 'video';

    // File URL that the client can request to show the image/video
    const mediaUrl = `/uploads/${req.file.filename}`;
    
    res.json({ mediaUrl, mediaType });
});

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
    socket.on('chatMessage', (data) => {
        // Handle both simple string payload (backward compatibility) or structured object payload
        if (typeof data === 'string') {
            data = { text: data, mediaUrl: null, mediaType: null };
        }
        
        io.emit('chatMessage', {
            username: socket.username,
            text: data.text,
            mediaUrl: data.mediaUrl || null,
            mediaType: data.mediaType || null,
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
