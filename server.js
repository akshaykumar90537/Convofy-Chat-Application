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
const Message = require('./models/Message');

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
        const { username, password, securityQuestion, securityAnswer } = req.body;
        
        if (!username || !password || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ error: 'All fields (username, password, security question, and answer) are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
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
        
        // Convert answer to lowercase before hashing so it's case-insensitive during reset
        const processedAnswer = securityAnswer.trim().toLowerCase();
        const hashedAnswer = await bcrypt.hash(processedAnswer, salt);

        const newUser = new User({
            username,
            password: hashedPassword,
            securityQuestion,
            securityAnswer: hashedAnswer
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

// Forgot Password - Get Question
app.post('/api/forgot-password-question', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.securityQuestion) {
            return res.status(400).json({ error: 'No security question set for this account. Please create a new account.' });
        }

        res.status(200).json({ question: user.securityQuestion });
    } catch (error) {
        console.error('Forgot password question error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Forgot Password - Verify Answer and Reset
app.post('/api/forgot-password-reset', async (req, res) => {
    try {
        const { username, securityAnswer, newPassword } = req.body;
        if (!username || !securityAnswer || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify Answer
        const processedAnswer = securityAnswer.trim().toLowerCase();
        const isAnswerMatch = await bcrypt.compare(processedAnswer, user.securityAnswer);
        
        if (!isAnswerMatch) {
            return res.status(401).json({ error: 'Incorrect answer' });
        }

        // Hash new password and update
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Forgot password reset error:', error);
        res.status(500).json({ error: 'Server error' });
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
    else if (mime.startsWith('video/')) mediaType = 'video';
    else if (mime.startsWith('audio/') || req.file.originalname.endsWith('.webm') || req.file.originalname.endsWith('.ogg') || req.file.originalname.endsWith('.wav')) mediaType = 'audio';

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
    socket.on('joinChat', async (username) => {
        socket.username = username || 'Anonymous';
        activeUsers[socket.id] = socket.username;
        broadcastActiveUsers(); // update list with new name

        io.emit('userStatus', {
            type: 'join',
            message: `${socket.username} joined the chat`,
            timestamp: new Date().toISOString(),
        });

        // Fetch past messages
        try {
            const messages = await Message.find().sort({ createdAt: 1 }).limit(100);
            socket.emit('loadMessages', messages);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    });

    // Listen for incoming chat messages
    socket.on('chatMessage', async (data) => {
        // Handle both simple string payload (backward compatibility) or structured object payload
        if (typeof data === 'string') {
            data = { text: data, mediaUrl: null, mediaType: null };
        }
        
        try {
            const newMessage = new Message({
                text: data.text || '',
                mediaUrl: data.mediaUrl || null,
                mediaType: data.mediaType || null,
                authorUsername: socket.username,
                authorId: socket.id,
                replyTo: data.replyTo || null
            });
            await newMessage.save();

            io.emit('chatMessage', newMessage);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    // Handle Edit Message
    socket.on('editMessage', async ({ messageId, newText }) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg && msg.authorId === socket.id && !msg.isDeleted) {
                msg.text = newText;
                msg.isEdited = true;
                await msg.save();
                io.emit('messageEdited', msg);
            }
        } catch (err) {
            console.error('Error editing message:', err);
        }
    });

    // Handle Delete Message
    socket.on('deleteMessage', async (messageId) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg && msg.authorId === socket.id) {
                msg.isDeleted = true;
                msg.text = '';
                msg.mediaUrl = null;
                msg.mediaType = null;
                await msg.save();
                io.emit('messageDeleted', msg);
            }
        } catch (err) {
            console.error('Error deleting message:', err);
        }
    });

    // Handle Reactions
    socket.on('messageReaction', async ({ messageId, reaction }) => {
        try {
            const msg = await Message.findById(messageId);
            if (msg && !msg.isDeleted) {
                const usersReacted = msg.reactions.get(reaction) || [];
                if (!usersReacted.includes(socket.username)) {
                    usersReacted.push(socket.username);
                    msg.reactions.set(reaction, usersReacted);
                    await msg.save();
                    io.emit('messageReactionUpdated', { messageId, reactions: Object.fromEntries(msg.reactions) });
                } else {
                    // Remove reaction if clicked again
                    const newReacts = usersReacted.filter(u => u !== socket.username);
                    if (newReacts.length > 0) {
                        msg.reactions.set(reaction, newReacts);
                    } else {
                        msg.reactions.delete(reaction);
                    }
                    await msg.save();
                    io.emit('messageReactionUpdated', { messageId, reactions: Object.fromEntries(msg.reactions) });
                }
            }
        } catch (err) {
            console.error('Error reacting to message:', err);
        }
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
