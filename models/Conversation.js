const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    isGroup: {
        type: Boolean,
        default: false
    },
    isGlobal: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        default: ''
    },
    participants: {
        type: [String], // Array of usernames
        default: []
    },
    admin: {
        type: String, // Username of the group admin
        default: null
    }
}, { timestamps: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
