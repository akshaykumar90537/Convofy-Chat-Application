const socket = io();

// UI Elements
const joinScreen = document.getElementById('join-screen');
const mainLayout = document.getElementById('main-layout');
const joinForm = document.getElementById('join-form');
const usernameInput = document.getElementById('username-input');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const chatMessages = document.getElementById('chat-messages');
const displayUsername = document.getElementById('display-username');

// New UI Elements
const activeUsersList = document.getElementById('active-users-list');
const onlineCountNumber = document.getElementById('online-count-number');
const typingIndicator = document.getElementById('typing-indicator');
const typingUsername = document.getElementById('typing-username');
const themeToggle = document.getElementById('theme-toggle');

// Handle Theme Initialization
const savedTheme = localStorage.getItem('chat-theme') || 'dark';
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeToggle.textContent = '☀️';
} else {
    themeToggle.textContent = '🌙';
}

// Handle Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('chat-theme', isLight ? 'light' : 'dark');
    themeToggle.textContent = isLight ? '☀️' : '🌙';
});

let currentUsername = 'Anonymous';
let typingTimer;
const TYPING_TIMEOUT = 1500; // ms to clear typing
let isTyping = false;

// Handle Join
joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (!name) {
        alert('Please enter your name');
        return;
    }
    currentUsername = name;
    
    // Switch screens
    joinScreen.classList.remove('active');
    setTimeout(() => {
        joinScreen.classList.add('hidden');
        mainLayout.classList.remove('hidden');
        setTimeout(() => mainLayout.classList.add('active'), 10);
    }, 400);

    displayUsername.textContent = currentUsername;
    socket.emit('joinChat', currentUsername);
});

// Handle Send Message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    if (!msg) return;

    socket.emit('chatMessage', msg);
    msgInput.value = '';
    msgInput.focus();

    // Immediately stop typing
    clearTimeout(typingTimer);
    if(isTyping) {
        isTyping = false;
        socket.emit('stopTyping');
    }
});

// Handle Typing events on input
msgInput.addEventListener('input', () => {
    if (!msgInput.value.trim()) {
        // If input cleared manually
        clearTimeout(typingTimer);
        if(isTyping) {
            isTyping = false;
            socket.emit('stopTyping');
        }
        return;
    }

    if (!isTyping) {
        isTyping = true;
        socket.emit('typing');
    }

    // Clear timeout and start a new one
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isTyping = false;
        socket.emit('stopTyping');
    }, TYPING_TIMEOUT);
});

// Handle Incoming Active Users update
socket.on('activeUsers', (data) => {
    onlineCountNumber.textContent = data.count;
    
    // Clear list
    activeUsersList.innerHTML = '';
    data.users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user;
        if (user === currentUsername) {
            li.classList.add('me');
            li.textContent += ' (You)';
        }
        activeUsersList.appendChild(li);
    });
});

// Handle Incoming Typing Status
let currentlyTypingUsers = new Set();
socket.on('userTyping', (username) => {
    currentlyTypingUsers.add(username);
    updateTypingUI();
});

socket.on('userStoppedTyping', (username) => {
    currentlyTypingUsers.delete(username);
    updateTypingUI();
});

function updateTypingUI() {
    if (currentlyTypingUsers.size > 0) {
        const typers = Array.from(currentlyTypingUsers);
        let text = typers.length === 1 ? typers[0] : (typers.length === 2 ? `${typers[0]} and ${typers[1]}` : 'Multiple people');
        typingUsername.textContent = text;
        typingIndicator.classList.remove('hidden');
        scrollToBottom(); // ensure indicator covers nicely
    } else {
        typingIndicator.classList.add('hidden');
    }
}


// Handle Incoming Messages
socket.on('chatMessage', (data) => {
    const isOwn = data.authorId === socket.id;
    const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageEl = document.createElement('div');
    messageEl.classList.add('message');
    messageEl.classList.add(isOwn ? 'own' : 'other');

    messageEl.innerHTML = `
        ${!isOwn ? `<div class="meta">${escapeHTML(data.username)}</div>` : ''}
        <div class="bubble">${escapeHTML(data.text)}</div>
        <div class="time">${time}</div>
    `;

    chatMessages.appendChild(messageEl);
    scrollToBottom();
});

// Handle Status Messages (Join/Leave)
socket.on('userStatus', (data) => {
    const statusEl = document.createElement('div');
    statusEl.classList.add('status-msg');
    statusEl.textContent = data.message;
    chatMessages.appendChild(statusEl);
    scrollToBottom();
});


// Util: Scroll To Bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Util: Escape HTML to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
