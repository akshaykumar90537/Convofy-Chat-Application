require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'convofy-super-secret-key';
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

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

let globalChatId = null;
async function initGlobalChat() {
    let globalChat = await Conversation.findOne({ isGlobal: true });
    if (!globalChat) {
        globalChat = new Conversation({ isGroup: true, isGlobal: true, name: 'Convofy Global' });
        await globalChat.save();
    }
    globalChatId = globalChat._id.toString();
}

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/convofy';
mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');
        await initGlobalChat();
    })
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

// REST API Endpoints for Authentication & Data

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username');
        res.json(users);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.get('/api/conversations/:username', async (req, res) => {
    try {
        const convos = await Conversation.find({
            $or: [{ participants: req.params.username }, { isGlobal: true }]
        });
        res.json(convos);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

app.get('/api/messages/:conversationId', async (req, res) => {
    try {
        const messages = await Message.find({ conversationId: req.params.conversationId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch(err) { res.status(500).json({error: 'Server error'}); }
});

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

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
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
        
        const token = jwt.sign({ username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({ message: 'User registered successfully', username, token });
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

        const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ message: 'Login successful', username: user.username, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Verify Token (Auto-login)
app.get('/api/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        res.status(200).json({ username: user.username });
    });
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

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
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

        // Join global chat by default
        if (globalChatId) socket.join(globalChatId);
        
        // Fetch and join user's conversations
        try {
            const convos = await Conversation.find({ participants: socket.username });
            convos.forEach(c => socket.join(c._id.toString()));
        } catch (err) {}
    });

    // Admin Actions
    socket.on('adminAction', async ({ action, conversationId, targetUser, newName }) => {
        try {
            const convo = await Conversation.findById(conversationId);
            if (!convo || convo.admin !== socket.username) return;
            
            if (action === 'kick') {
                convo.participants = convo.participants.filter(p => p !== targetUser);
                await convo.save();
                io.to(conversationId).emit('participantRemoved', { conversationId, targetUser });
                io.to(conversationId).emit('chatMessage', {
                    _id: Date.now().toString(),
                    conversationId,
                    text: `${targetUser} was removed from the group by admin.`,
                    authorUsername: 'System',
                    isSystem: true
                });
            } else if (action === 'add') {
                if (!convo.participants.includes(targetUser)) {
                    convo.participants.push(targetUser);
                    await convo.save();
                    io.to(conversationId).emit('participantAdded', { conversationId, targetUser });
                    io.to(conversationId).emit('chatMessage', {
                        _id: Date.now().toString(),
                        conversationId,
                        text: `${targetUser} was added to the group by admin.`,
                        authorUsername: 'System',
                        isSystem: true
                    });
                }
            } else if (action === 'rename') {
                convo.name = newName;
                await convo.save();
                io.to(conversationId).emit('groupRenamed', { conversationId, newName });
            }
        } catch(err) { console.error('Admin action error:', err); }
    });

    // Start Private Chat
    socket.on('startPrivateChat', async ({ targetUsername }) => {
        try {
            let convo = await Conversation.findOne({
                isGroup: false,
                isGlobal: false,
                participants: { $all: [socket.username, targetUsername], $size: 2 }
            });
            if (!convo) {
                convo = new Conversation({ isGroup: false, participants: [socket.username, targetUsername] });
                await convo.save();
            }
            socket.join(convo._id.toString());
            io.emit('conversationCreated', convo);
        } catch(err) {}
    });

    // Create Group
    socket.on('createGroup', async ({ name, participants }) => {
        try {
            if (!participants.includes(socket.username)) participants.push(socket.username);
            const convo = new Conversation({ isGroup: true, name, participants, admin: socket.username });
            await convo.save();
            socket.join(convo._id.toString());
            io.emit('conversationCreated', convo);
        } catch (err) {}
    });

    // Read Receipts
    socket.on('markAsRead', async ({ conversationId, messageIds }) => {
        try {
            if (!messageIds || messageIds.length === 0) return;
            await Message.updateMany(
                { _id: { $in: messageIds }, conversationId },
                { $addToSet: { readBy: socket.username } }
            );
            io.to(conversationId).emit('messagesRead', { conversationId, messageIds, readBy: socket.username });
        } catch(err) {}
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
                replyTo: data.replyTo || null,
                conversationId: data.conversationId || globalChatId,
                readBy: [socket.username]
            });
            await newMessage.save();

            io.to(newMessage.conversationId.toString()).emit('chatMessage', newMessage);
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
                io.to(msg.conversationId.toString()).emit('messageEdited', msg);
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
                io.to(msg.conversationId.toString()).emit('messageDeleted', msg);
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
                    io.to(msg.conversationId.toString()).emit('messageReactionUpdated', { messageId, reactions: Object.fromEntries(msg.reactions) });
                } else {
                    // Remove reaction if clicked again
                    const newReacts = usersReacted.filter(u => u !== socket.username);
                    if (newReacts.length > 0) {
                        msg.reactions.set(reaction, newReacts);
                    } else {
                        msg.reactions.delete(reaction);
                    }
                    await msg.save();
                    io.to(msg.conversationId.toString()).emit('messageReactionUpdated', { messageId, reactions: Object.fromEntries(msg.reactions) });
                }
            }
        } catch (err) {
            console.error('Error reacting to message:', err);
        }
    });

    // Handle typing events
    socket.on('typing', (conversationId) => {
        socket.to(conversationId).emit('userTyping', { username: socket.username, conversationId });
    });

    socket.on('stopTyping', (conversationId) => {
        socket.to(conversationId).emit('userStoppedTyping', { username: socket.username, conversationId });
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
