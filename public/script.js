const socket = io({ autoConnect: false });

// Initialize GSAP Animations for Interactive Login
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('login-active');

    // Entrance Animation
    if (document.querySelector('.login-card')) {
        gsap.to(".login-card", {
            y: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            delay: 0.2
        });
    }

    // Floating Orbs Animation
    if (document.querySelector('.orb-1')) {
        gsap.to(".orb-1", {
            x: "random(-50, 50)",
            y: "random(-50, 50)",
            duration: 5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
        
        gsap.to(".orb-2", {
            x: "random(-70, 70)",
            y: "random(-70, 70)",
            duration: 7,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        gsap.to(".orb-3", {
            x: "random(-100, 100)",
            y: "random(-100, 100)",
            duration: 6,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
});

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
const micBtn = document.getElementById('mic-btn');
const inputContextBanner = document.getElementById('input-context-banner');
const inputContextText = document.getElementById('input-context-text');
const cancelContextBtn = document.getElementById('cancel-context-btn');

let isLoginMode = true;

// Context States
let replyingToId = null;
let editingMessageId = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Handle Auth Toggle
authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    
    // Animate card out slightly and fade
    gsap.to(".login-card", {
        scale: 0.95,
        opacity: 0.5,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        onRepeat: () => {
            if (isLoginMode) {
                authTitle.textContent = 'Welcome Back';
                authSubtitle.textContent = 'Login to continue to Convofy.';
                authSubmitBtn.textContent = 'Login';
                authToggleText.textContent = "Don't have an account?";
                authToggleBtn.textContent = 'Register';
                document.getElementById('register-fields').style.display = 'none';
                document.getElementById('security-question').required = false;
                document.getElementById('security-answer').required = false;
                document.querySelector('.forgot-pwd-wrapper').style.display = 'block';
            } else {
                authTitle.textContent = 'Create an Account';
                authSubtitle.textContent = 'Join Convofy by creating an account.';
                authSubmitBtn.textContent = 'Register';
                authToggleText.textContent = "Already have an account?";
                authToggleBtn.textContent = 'Login';
                document.getElementById('register-fields').style.display = 'block';
                document.getElementById('security-question').required = true;
                document.getElementById('security-answer').required = true;
                document.querySelector('.forgot-pwd-wrapper').style.display = 'none';
            }
            authError.classList.add('hidden');
        }
    });
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

    if (name.length < 3) {
        showError('Username cannot be less than 3 characters');
        return;
    }

    try {
        const endpoint = isLoginMode ? '/api/login' : '/api/register';
        const payload = { username: name, password: password };
        
        if (!isLoginMode) {
            payload.securityQuestion = document.getElementById('security-question').value;
            payload.securityAnswer = document.getElementById('security-answer').value;
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            showError(data.error || 'Authentication failed');
            return;
        }

        currentUsername = data.username;
        authError.classList.add('hidden');
        
        // Connect Socket
        socket.connect();
        
        // Switch screens with GSAP transition
        gsap.to("#join-screen", {
            y: -50,
            opacity: 0,
            scale: 0.9,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => {
                joinScreen.classList.remove('active');
                joinScreen.style.display = 'none';
                
                // Hide orbs
                document.querySelectorAll('.orb').forEach(orb => orb.style.display = 'none');
                
                // Remove login-active class
                document.body.classList.remove('login-active');
                
                mainLayout.classList.remove('hidden');
                
                gsap.fromTo("#main-layout", 
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", onStart: () => { mainLayout.classList.add('active'); } }
                );
            }
        });

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

// Handle Context Banner
function clearContext() {
    replyingToId = null;
    editingMessageId = null;
    inputContextBanner.classList.add('hidden');
}

cancelContextBtn.addEventListener('click', () => {
    clearContext();
    msgInput.value = '';
});

// Handle Send Message
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = msgInput.value.trim();
    if (!msg) return;

    if (editingMessageId) {
        socket.emit('editMessage', { messageId: editingMessageId, newText: msg });
        clearContext();
    } else {
        const payload = { text: msg, mediaUrl: null, mediaType: null };
        if (replyingToId) {
            const replyMsg = document.getElementById(`msg-${replyingToId}`);
            if (replyMsg) {
                const author = replyMsg.querySelector('.meta') ? replyMsg.querySelector('.meta').textContent : currentUsername;
                const text = replyMsg.querySelector('.bubble-text') ? replyMsg.querySelector('.bubble-text').textContent : (replyMsg.querySelector('.chat-media-img') || replyMsg.querySelector('.chat-media-video') || replyMsg.querySelector('.chat-media-audio') ? 'Media file' : '');
                payload.replyTo = { messageId: replyingToId, text: text, authorUsername: author };
            }
        }
        socket.emit('chatMessage', payload);
        clearContext();
    }

    msgInput.value = '';
    msgInput.focus();

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

// Handle Voice Notes (Mic)
micBtn.addEventListener('click', async () => {
    if (isRecording) {
        // Stop recording
        mediaRecorder.stop();
        micBtn.classList.remove('recording');
        isRecording = false;
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.addEventListener('dataavailable', event => {
            audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            const formData = new FormData();
            formData.append('media', audioBlob, 'voice-note.webm');

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if(res.ok) {
                    socket.emit('chatMessage', {
                        text: '',
                        mediaUrl: data.mediaUrl,
                        mediaType: 'audio'
                    });
                } else {
                    alert(data.error || 'Failed to upload voice note');
                }
            } catch (err) {
                console.error(err);
                alert('Could not upload voice note');
            }

            stream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        isRecording = true;
        micBtn.classList.add('recording');
    } catch (err) {
        console.error('Mic error:', err);
        alert('Could not access microphone');
    }
});

// Handle Typing events on input
msgInput.addEventListener('input', () => {
    if (!msgInput.value.trim()) {
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

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isTyping = false;
        socket.emit('stopTyping');
    }, TYPING_TIMEOUT);
});

// Handle Incoming Active Users update
socket.on('activeUsers', (data) => {
    onlineCountNumber.textContent = data.count;
    
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
        scrollToBottom();
    } else {
        typingIndicator.classList.add('hidden');
    }
}

// Load message history
socket.on('loadMessages', (messages) => {
    chatMessages.innerHTML = '';
    messages.forEach(renderMessage);
    scrollToBottom();
});

// Handle Incoming Messages
socket.on('chatMessage', (data) => {
    renderMessage(data);
    scrollToBottom();
});

function renderMessage(data) {
    const isOwn = data.authorId === socket.id;
    const timestamp = data.createdAt || data.timestamp || new Date();
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let messageEl = document.getElementById(`msg-${data._id}`);
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = `msg-${data._id}`;
        messageEl.classList.add('message');
        messageEl.classList.add(isOwn ? 'own' : 'other');
        chatMessages.appendChild(messageEl);
    }

    let innerHtml = '';

    if (!isOwn) {
        innerHtml += `<div class="meta">${escapeHTML(data.authorUsername || data.username || 'Unknown')}</div>`;
    }

    innerHtml += `<div class="bubble">`;

    if (data.isDeleted) {
        innerHtml += `<span class="deleted-text">🚫 This message was deleted</span>`;
    } else {
        // Reply Preview
        if (data.replyTo && data.replyTo.messageId) {
            innerHtml += `
                <div class="reply-preview">
                    <div class="reply-author">${escapeHTML(data.replyTo.authorUsername || '')}</div>
                    <div class="reply-text">${escapeHTML(data.replyTo.text || '')}</div>
                </div>
            `;
        }

        // Content
        if (data.mediaUrl) {
            if (data.mediaType === 'image') {
                innerHtml += `<img src="${data.mediaUrl}" class="chat-media-img" alt="Uploaded Image" onload="scrollToBottom()">`;
            } else if (data.mediaType === 'video') {
                innerHtml += `<video src="${data.mediaUrl}" class="chat-media-video" controls onloadedmetadata="scrollToBottom()"></video>`;
            } else if (data.mediaType === 'audio') {
                innerHtml += `<audio src="${data.mediaUrl}" class="chat-media-audio" controls></audio>`;
            }
        } else {
            innerHtml += `<span class="bubble-text">${escapeHTML(data.text || '')}</span>`;
        }

        if (data.isEdited) {
            innerHtml += `<span class="edited-tag">(Edited)</span>`;
        }
    }

    innerHtml += `</div>`; // end bubble
    innerHtml += `<div class="time">${time}</div>`;

    // Actions Menu
    if (!data.isDeleted) {
        innerHtml += `<div class="message-actions">`;
        innerHtml += `<button type="button" class="action-btn" onclick="reactToMessage('${data._id}', '👍')">👍</button>`;
        innerHtml += `<button type="button" class="action-btn" onclick="reactToMessage('${data._id}', '❤️')">❤️</button>`;
        innerHtml += `<button type="button" class="action-btn" onclick="reactToMessage('${data._id}', '😂')">😂</button>`;
        innerHtml += `<button type="button" class="action-btn" onclick="replyToMessage('${data._id}')" title="Reply">↩️</button>`;
        if (isOwn) {
            innerHtml += `<button type="button" class="action-btn" onclick="editMessageInit('${data._id}')" title="Edit">✏️</button>`;
            innerHtml += `<button type="button" class="action-btn" onclick="deleteMessage('${data._id}')" title="Delete">🗑️</button>`;
        }
        innerHtml += `</div>`;
    }

    // Reactions
    if (data.reactions && Object.keys(data.reactions).length > 0) {
        innerHtml += `<div class="reactions-container">`;
        for (const [emoji, users] of Object.entries(data.reactions)) {
            if (users.length > 0) {
                const isReacted = users.includes(currentUsername);
                innerHtml += `<span class="reaction-badge ${isReacted ? 'reacted' : ''}" onclick="reactToMessage('${data._id}', '${emoji}')" title="${users.join(', ')}">${emoji} ${users.length}</span>`;
            }
        }
        innerHtml += `</div>`;
    }

    messageEl.innerHTML = innerHtml;
}

// Global action functions
window.replyToMessage = (id) => {
    replyingToId = id;
    editingMessageId = null;
    const msgEl = document.getElementById(`msg-${id}`);
    const authorNode = msgEl.querySelector('.meta');
    const author = authorNode ? authorNode.textContent : currentUsername;
    inputContextText.textContent = `Replying to ${author}`;
    inputContextBanner.classList.remove('hidden');
    msgInput.focus();
};

window.editMessageInit = (id) => {
    editingMessageId = id;
    replyingToId = null;
    const msgEl = document.getElementById(`msg-${id}`);
    const textNode = msgEl.querySelector('.bubble-text');
    if (textNode) {
        msgInput.value = textNode.textContent;
    }
    inputContextText.textContent = `Editing message...`;
    inputContextBanner.classList.remove('hidden');
    msgInput.focus();
};

window.deleteMessage = (id) => {
    if (confirm('Are you sure you want to delete this message?')) {
        socket.emit('deleteMessage', id);
    }
};

window.reactToMessage = (id, emoji) => {
    socket.emit('messageReaction', { messageId: id, reaction: emoji });
};

// Listeners for updates
socket.on('messageEdited', (data) => {
    renderMessage(data);
});

socket.on('messageDeleted', (data) => {
    renderMessage(data);
});

socket.on('messageReactionUpdated', (data) => {
    const msgEl = document.getElementById(`msg-${data.messageId}`);
    if (msgEl) {
        let reactContainer = msgEl.querySelector('.reactions-container');
        if (!reactContainer) {
            reactContainer = document.createElement('div');
            reactContainer.className = 'reactions-container';
            msgEl.appendChild(reactContainer);
        }
        let reactHtml = '';
        for (const [emoji, users] of Object.entries(data.reactions)) {
            if (users.length > 0) {
                const isReacted = users.includes(currentUsername);
                reactHtml += `<span class="reaction-badge ${isReacted ? 'reacted' : ''}" onclick="reactToMessage('${data.messageId}', '${emoji}')" title="${users.join(', ')}">${emoji} ${users.length}</span>`;
            }
        }
        reactContainer.innerHTML = reactHtml;
    }
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
    if (!str) return '';
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

// ==========================================
// Forgot Password Logic
// ==========================================
const forgotBtn = document.getElementById('forgot-btn');
const forgotModal = document.getElementById('forgot-modal');
const closeForgotBtn = document.getElementById('close-forgot-btn');
const forgotStep1 = document.getElementById('forgot-step-1');
const forgotStep2 = document.getElementById('forgot-step-2');
const forgotUsernameInput = document.getElementById('forgot-username');
const forgotNextBtn = document.getElementById('forgot-next-btn');
const forgotError1 = document.getElementById('forgot-error-1');
const displaySecurityQuestion = document.getElementById('display-security-question');
const forgotAnswerInput = document.getElementById('forgot-answer');
const forgotNewPasswordInput = document.getElementById('forgot-new-password');
const forgotError2 = document.getElementById('forgot-error-2');
const forgotResetBtn = document.getElementById('forgot-reset-btn');

let resetUsername = '';

forgotBtn.addEventListener('click', () => {
    forgotModal.classList.remove('hidden');
    forgotStep1.classList.remove('hidden');
    forgotStep2.classList.add('hidden');
    forgotUsernameInput.value = '';
    forgotError1.classList.add('hidden');
    forgotError2.classList.add('hidden');
});

closeForgotBtn.addEventListener('click', () => {
    forgotModal.classList.add('hidden');
});

forgotNextBtn.addEventListener('click', async () => {
    const username = forgotUsernameInput.value.trim();
    if (!username) {
        forgotError1.textContent = 'Please enter your username';
        forgotError1.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/forgot-password-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();

        if (!res.ok) {
            forgotError1.textContent = data.error || 'User not found';
            forgotError1.classList.remove('hidden');
            return;
        }

        resetUsername = username;
        displaySecurityQuestion.textContent = data.question;
        forgotStep1.classList.add('hidden');
        forgotStep2.classList.remove('hidden');
        forgotAnswerInput.value = '';
        forgotNewPasswordInput.value = '';
        forgotError2.classList.add('hidden');
    } catch (err) {
        forgotError1.textContent = 'Network error';
        forgotError1.classList.remove('hidden');
    }
});

forgotResetBtn.addEventListener('click', async () => {
    const answer = forgotAnswerInput.value.trim();
    const newPassword = forgotNewPasswordInput.value.trim();

    if (!answer || !newPassword) {
        forgotError2.textContent = 'Please fill all fields';
        forgotError2.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/forgot-password-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: resetUsername, 
                securityAnswer: answer, 
                newPassword: newPassword 
            })
        });
        const data = await res.json();

        if (!res.ok) {
            forgotError2.textContent = data.error || 'Reset failed';
            forgotError2.classList.remove('hidden');
            return;
        }

        alert('Password reset successful! You can now login.');
        forgotModal.classList.add('hidden');
    } catch (err) {
        forgotError2.textContent = 'Network error';
        forgotError2.classList.remove('hidden');
    }
});
