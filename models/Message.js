const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    text: {
        type: String,
        default: ''
    },
    mediaUrl: {
        type: String,
        default: null
    },
    mediaType: {
        type: String,
        default: null
    },
    authorUsername: {
        type: String,
        required: true
    },
    authorId: {
        type: String,
        required: true
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    replyTo: {
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null
        },
        text: String,
        authorUsername: String
    },
    reactions: {
        type: Map,
        of: [String], // Array of usernames
        default: {}
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    readBy: {
        type: [String], // Array of usernames who read the message
        default: []
    }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
