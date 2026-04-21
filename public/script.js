const socket = io({ autoConnect: false });

// UI Elements
const joinScreen = document.getElementById('join-screen');
const mainLayout = document.getElementById('main-layout');
const joinForm = document.getElementById('join-form');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authError = document.getElementById('auth-error');

const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');
const chatMessages = document.getElementById('chat-messages');
const displayUsername = document.getElementById('display-username');
const attachmentBtn = document.getElementById('attachment-btn');
const mediaInput = document.getElementById('media-input');

let isLoginMode = true;

// Handle Auth Toggle
authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Login to continue to Convofy.';
        authSubmitBtn.textContent = 'Login';
        authToggleText.textContent = "Don't have an account?";
        authToggleBtn.textContent = 'Register';
    } else {
        authTitle.textContent = 'Create an Account';
        authSubtitle.textContent = 'Join Convofy by creating an account.';
        authSubmitBtn.textContent = 'Register';
        authToggleText.textContent = "Already have an account?";
        authToggleBtn.textContent = 'Login';
    }
    authError.classList.add('hidden');
});


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

// Handle Join / Login / Register
joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!name || !password) {
        showError('Please enter both username and password');
        return;
    }

    try {
        const endpoint = isLoginMode ? '/api/login' : '/api/register';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: name, password: password })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            showError(data.error || 'Authentication failed');
            return;
        }

        // If registration is successful, automatically log them in or switch to login mode?
        // Let's just proceed to connect for simpler flow since server returns username
        
        currentUsername = data.username;
        authError.classList.add('hidden');
        
        // Connect Socket
        socket.connect();
        
        // Switch screens
        joinScreen.classList.remove('active');
        setTimeout(() => {
            joinScreen.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            setTimeout(() => mainLayout.classList.add('active'), 10);
        }, 400);

        displayUsername.textContent = currentUsername;
        socket.emit('joinChat', currentUsername);
        
    } catch (err) {
        console.error('Auth error:', err);
        showError('Could not connect to server. Please try again.');
    }
});

function showError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
}

// Handle Send Message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    if (!msg) return;

    socket.emit('chatMessage', { text: msg, mediaUrl: null, mediaType: null });
    msgInput.value = '';
    msgInput.focus();

    // Immediately stop typing
    clearTimeout(typingTimer);
    if(isTyping) {
        isTyping = false;
        socket.emit('stopTyping');
    }
});

// Handle Attachment Button
attachmentBtn.addEventListener('click', () => {
    mediaInput.click();
});

// Handle Media Upload
mediaInput.addEventListener('change', async () => {
    const file = mediaInput.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
        alert('File size exceeds 20MB limit');
        return;
    }

    const formData = new FormData();
    formData.append('media', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if(!res.ok) {
            alert(data.error || 'Failed to upload media');
            return;
        }

        socket.emit('chatMessage', {
            text: '',
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType
        });
        
    } catch(err) {
        console.error('Upload error', err);
        alert('Could not upload file.');
    } finally {
        mediaInput.value = ''; // Reset
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

    let contentHtml = '';
    if (data.mediaUrl) {
        if (data.mediaType === 'image') {
            contentHtml = `<img src="${data.mediaUrl}" class="chat-media-img" alt="Uploaded Image" onload="scrollToBottom()">`;
        } else if (data.mediaType === 'video') {
            contentHtml = `<video src="${data.mediaUrl}" class="chat-media-video" controls onloadedmetadata="scrollToBottom()"></video>`;
        }
    } else {
        contentHtml = escapeHTML(data.text);
    }

    messageEl.innerHTML = `
        ${!isOwn ? `<div class="meta">${escapeHTML(data.username)}</div>` : ''}
        <div class="bubble">${contentHtml}</div>
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
