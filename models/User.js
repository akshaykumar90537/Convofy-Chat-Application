const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    securityQuestion: {
        type: String,
        required: true,
        default: 'What is your pet name?'
    },
    securityAnswer: {
        type: String,
        required: true
    },
    globalChatJoinedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
