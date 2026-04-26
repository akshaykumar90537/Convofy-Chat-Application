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

const typingIndicator = document.getElementById('typing-indicator');
const typingUsername = document.getElementById('typing-username');
const themeToggle = document.getElementById('theme-toggle');

const conversationsList = document.getElementById('conversations-list');
const chatTitle = document.getElementById('chat-title');
const groupAdminBtn = document.getElementById('group-admin-btn');
const createGroupModal = document.getElementById('create-group-modal');
const closeCreateGroupBtn = document.getElementById('close-create-group-btn');
const showCreateGroupBtn = document.getElementById('show-create-group-btn');
const newGroupName = document.getElementById('new-group-name');
const groupUsersSelect = document.getElementById('group-users-select');
const createGroupSubmit = document.getElementById('create-group-submit');
const adminModal = document.getElementById('admin-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');
const adminRenameInput = document.getElementById('admin-rename-input');
const adminRenameBtn = document.getElementById('admin-rename-btn');
const adminMembersList = document.getElementById('admin-members-list');
const adminAddUserSearch = document.getElementById('admin-add-user-search');
const adminAddUserList = document.getElementById('admin-add-user-list');
const adminAddUserBtn = document.getElementById('admin-add-user-btn');
const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
const sidebar = document.querySelector('.sidebar');

if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

let currentEligibleUsers = [];
let selectedUserToAdd = null;

if (adminAddUserSearch) {
    adminAddUserSearch.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        adminAddUserList.innerHTML = '';
        const filtered = currentEligibleUsers.filter(u => u.toLowerCase().includes(val));
        if(filtered.length === 0) {
            adminAddUserList.innerHTML = '<li style="color: #94a3b8; cursor: default;">No users found</li>';
        } else {
            filtered.forEach(u => {
                const li = document.createElement('li');
                li.textContent = u;
                if(u === selectedUserToAdd) li.classList.add('selected');
                li.addEventListener('click', () => {
                    selectedUserToAdd = u;
                    adminAddUserSearch.value = u;
                    adminAddUserList.classList.add('hidden');
                    Array.from(adminAddUserList.children).forEach(child => child.classList.remove('selected'));
                    li.classList.add('selected');
                });
                adminAddUserList.appendChild(li);
            });
        }
    });

    adminAddUserSearch.addEventListener('focus', () => {
        adminAddUserList.classList.remove('hidden');
        adminAddUserSearch.dispatchEvent(new Event('input'));
    });

    document.addEventListener('click', (e) => {
        if(!e.target.closest('#admin-add-user-dropdown')) {
            if(adminAddUserList && !adminAddUserList.classList.contains('hidden')) {
                adminAddUserList.classList.add('hidden');
            }
        }
    });
}
const adminGroupNameDisplay = document.getElementById('admin-group-name-display');

const themeIcon = document.getElementById('theme-icon');
const topRightMenuBtn = document.getElementById('top-right-menu-btn');
const topRightDropdown = document.getElementById('top-right-dropdown');

// Handle Theme Initialization
const savedTheme = localStorage.getItem('chat-theme') || 'dark';
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if(themeIcon) themeIcon.textContent = '☀️';
} else {
    if(themeIcon) themeIcon.textContent = '🌙';
}

// Handle Theme Toggle
if(themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('chat-theme', isLight ? 'light' : 'dark');
        if(themeIcon) themeIcon.textContent = isLight ? '☀️' : '🌙';
        // Close dropdown
        if(topRightDropdown) topRightDropdown.classList.add('hidden');
    });
}

// Handle Dropdown Toggle
if(topRightMenuBtn && topRightDropdown) {
    topRightMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        topRightDropdown.classList.toggle('hidden');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!topRightDropdown.contains(e.target) && !topRightMenuBtn.contains(e.target)) {
            topRightDropdown.classList.add('hidden');
        }
    });
}

let currentUsername = 'Anonymous';
let currentConversationId = null;
let allUsers = [];
let allConversations = [];
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
        localStorage.setItem('auth_token', data.token);
        authError.classList.add('hidden');
        
        transitionToChat();
        
    } catch (err) {
        console.error('Auth error:', err);
        showError('Could not connect to server. Please try again.');
    }
});

function transitionToChat() {
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
    loadData();
}

function verifyTokenOnLoad() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    fetch('/api/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.username) {
            currentUsername = data.username;
            transitionToChat();
        } else {
            localStorage.removeItem('auth_token');
        }
    })
    .catch(err => {
        console.error('Verification error:', err);
        localStorage.removeItem('auth_token');
    });
}

// Check auth token on startup
document.addEventListener('DOMContentLoaded', verifyTokenOnLoad);

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('auth_token');
        window.location.reload();
    });
}

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
        if(!currentConversationId) return alert('Select a conversation first');
        const payload = { text: msg, mediaUrl: null, mediaType: null, conversationId: currentConversationId };
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
            mediaType: data.mediaType,
            conversationId: currentConversationId
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
                        mediaType: 'audio',
                        conversationId: currentConversationId
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
            socket.emit('stopTyping', currentConversationId);
        }
        return;
    }

    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', currentConversationId);
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        isTyping = false;
        socket.emit('stopTyping', currentConversationId);
    }, TYPING_TIMEOUT);
});

// Handle Incoming Active Users update
socket.on('activeUsers', (data) => {
    const countElement = document.getElementById('header-online-count');
    if (countElement) {
        countElement.textContent = `(${data.count} online)`;
    }
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

// Data Loading & Conversations
async function loadData() {
    try {
        const [usersRes, convosRes] = await Promise.all([
            fetch('/api/users'),
            fetch(`/api/conversations/${currentUsername}`)
        ]);
        const users = await usersRes.json();
        allUsers = users.map(u => u.username);
        
        allConversations = await convosRes.json();
        renderConversations();
        
        if(allConversations.length > 0 && !currentConversationId) {
            const global = allConversations.find(c => c.isGlobal);
            switchConversation(global ? global._id : allConversations[0]._id);
        }
    } catch(err) { console.error('Error loading data', err); }
}

function renderConversations() {
    conversationsList.innerHTML = '';
    allConversations.forEach(c => {
        const li = document.createElement('li');
        li.style.cursor = 'pointer';
        let name = c.name;
        if(!c.isGroup) {
            name = c.participants.find(p => p !== currentUsername) || 'Self Chat';
        }
        
        // Generate Avatar color based on name
        const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
        const charCode = name.charCodeAt(0) || 0;
        const color = colors[charCode % colors.length];
        
        const avatar = document.createElement('div');
        avatar.className = 'convo-avatar';
        avatar.style.background = color;
        avatar.textContent = name.charAt(0).toUpperCase();
        
        const textSpan = document.createElement('span');
        textSpan.textContent = name;
        
        li.appendChild(avatar);
        li.appendChild(textSpan);
        
        if(c._id === currentConversationId) {
            li.classList.add('active-chat');
        }
        li.addEventListener('click', () => switchConversation(c._id));
        conversationsList.appendChild(li);
    });
}

window.switchConversation = async (id) => {
    currentConversationId = id;
    renderConversations();
    chatMessages.innerHTML = '';
    
    const convo = allConversations.find(c => c._id === id);
    if(convo) {
        let name = convo.name;
        if(!convo.isGroup) name = convo.participants.find(p => p !== currentUsername) || 'Self Chat';
        chatTitle.textContent = name;
        
        // Update header avatar
        const headerAvatar = document.getElementById('header-user-avatar');
        if (headerAvatar) {
            const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
            const charCode = name.charCodeAt(0) || 0;
            const color = colors[charCode % colors.length];
            headerAvatar.style.background = color;
            headerAvatar.textContent = name.charAt(0).toUpperCase();
        }
        
        if(convo.isGroup && convo.admin === currentUsername && !convo.isGlobal) {
            groupAdminBtn.classList.remove('hidden');
        } else {
            groupAdminBtn.classList.add('hidden');
        }
    }

    try {
        const res = await fetch(`/api/messages/${id}`);
        const messages = await res.json();
        messages.forEach(renderMessage);
        scrollToBottom();
        
        // Mark as read
        const unread = messages.filter(m => m.authorUsername !== currentUsername && (!m.readBy || !m.readBy.includes(currentUsername))).map(m => m._id);
        if(unread.length > 0) {
            socket.emit('markAsRead', { conversationId: id, messageIds: unread });
        }
    } catch(err) { console.error('Error fetching messages', err); }
};

// Modal Events
showCreateGroupBtn.addEventListener('click', () => {
    createGroupModal.classList.remove('hidden');
    newGroupName.value = '';
    groupUsersSelect.innerHTML = '';
    allUsers.forEach(u => {
        if(u !== currentUsername) {
            groupUsersSelect.innerHTML += `<label><input type="checkbox" value="${u}"> ${u}</label>`;
        }
    });
});
closeCreateGroupBtn.addEventListener('click', () => createGroupModal.classList.add('hidden'));

createGroupSubmit.addEventListener('click', () => {
    const name = newGroupName.value.trim();
    if(!name) return alert('Enter group name');
    const checked = Array.from(groupUsersSelect.querySelectorAll('input:checked')).map(cb => cb.value);
    if(checked.length === 0) return alert('Select at least one member');
    socket.emit('createGroup', { name, participants: checked });
    createGroupModal.classList.add('hidden');
});

groupAdminBtn.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
    const convo = allConversations.find(c => c._id === currentConversationId);
    if(!convo) return;
    
    const currentName = convo.name || 'Group';
    adminGroupNameDisplay.textContent = currentName;
    adminRenameInput.value = currentName;
    
    adminMembersList.innerHTML = '';
    convo.participants.forEach(p => {
        const firstLetter = p.charAt(0).toUpperCase();
        let actionHtml = '';
        if (p === convo.admin) {
             actionHtml = `<span class="badge-admin">🛡️ Admin</span>`;
        } else {
             actionHtml = `<button class="badge-kick-btn" onclick="kickUser('${p}')">🚫 Kick</button>`;
        }
        
        const hash = [...p].reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue = hash % 360;
        const gradient = `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 40) % 360}, 70%, 50%))`;

        let html = `
            <li>
                <div class="member-avatar-info">
                    <div class="member-avatar" style="background: ${gradient}">${firstLetter}</div>
                    <span class="member-name">${p}</span>
                </div>
                ${actionHtml}
            </li>
        `;
        adminMembersList.innerHTML += html;
    });

    currentEligibleUsers = allUsers.filter(u => !convo.participants.includes(u));
    selectedUserToAdd = null;
    adminAddUserSearch.value = '';
    adminAddUserList.classList.add('hidden');
});
closeAdminBtn.addEventListener('click', () => adminModal.classList.add('hidden'));

adminRenameBtn.addEventListener('click', () => {
    const newName = adminRenameInput.value.trim();
    if(newName) socket.emit('adminAction', { action: 'rename', conversationId: currentConversationId, newName });
});
adminAddUserBtn.addEventListener('click', () => {
    const targetUser = selectedUserToAdd || adminAddUserSearch.value.trim();
    if(targetUser) {
        socket.emit('adminAction', { action: 'add', conversationId: currentConversationId, targetUser });
        adminAddUserSearch.value = '';
        selectedUserToAdd = null;
    }
});
window.kickUser = (user) => {
    if(confirm(`Kick ${user}?`)) socket.emit('adminAction', { action: 'kick', conversationId: currentConversationId, targetUser: user });
};
window.startPrivateChat = (user) => {
    socket.emit('startPrivateChat', { targetUsername: user });
    tabChats.click();
};

socket.on('conversationCreated', (convo) => {
    if(convo.participants.includes(currentUsername) || convo.isGlobal) {
        const exists = allConversations.find(c => c._id === convo._id);
        if(!exists) {
            allConversations.push(convo);
            renderConversations();
        }
        if(!currentConversationId) switchConversation(convo._id);
    }
});
socket.on('participantAdded', () => loadData());
socket.on('participantRemoved', () => loadData());
socket.on('groupRenamed', () => loadData());

// Handle Incoming Messages
socket.on('chatMessage', (data) => {
    if(data.conversationId === currentConversationId) {
        renderMessage(data);
        scrollToBottom();
        if(data.authorUsername !== currentUsername) {
            socket.emit('markAsRead', { conversationId: data.conversationId, messageIds: [data._id] });
        }
    } else {
        // notification logic could go here
    }
});

socket.on('messagesRead', ({ conversationId, messageIds, readBy }) => {
    if(conversationId !== currentConversationId) return;
    messageIds.forEach(id => {
        const msgEl = document.getElementById(`msg-${id}`);
        if(msgEl) {
            const receiptSpan = msgEl.querySelector('.read-receipts');
            if(receiptSpan) {
                receiptSpan.classList.remove('sent');
                receiptSpan.classList.add('read');
                receiptSpan.textContent = '✓✓';
            }
        }
    });
});

function renderMessage(data) {
    const isOwn = data.authorId === socket.id || data.authorUsername === currentUsername;
    const timestamp = data.createdAt || data.timestamp || new Date();
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if(data.isSystem) {
        const statusEl = document.createElement('div');
        statusEl.classList.add('status-msg');
        statusEl.textContent = data.text;
        chatMessages.appendChild(statusEl);
        return;
    }

    let messageEl = document.getElementById(`msg-${data._id}`);
    if (!messageEl) {
        messageEl = document.createElement('div');
        messageEl.id = `msg-${data._id}`;
        messageEl.classList.add('message-wrapper');
        messageEl.classList.add(isOwn ? 'own' : 'other');
        chatMessages.appendChild(messageEl);
    }

    let innerHtml = '';
    
    const authorName = data.authorUsername || data.username || 'Unknown';
    const firstLetter = authorName.charAt(0).toUpperCase();
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
    const charCode = authorName.charCodeAt(0) || 0;
    const color = colors[charCode % colors.length];

    if (!isOwn) {
        innerHtml += `<div class="msg-avatar" style="background: ${color}">${firstLetter}</div>`;
    }

    innerHtml += `<div class="message ${isOwn ? 'own' : 'other'}">`;

    if (!isOwn) {
        innerHtml += `<div class="meta">${escapeHTML(authorName)}</div>`;
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
    
    // Read Receipts logic
    const isRead = data.readBy && data.readBy.length > 1;
    let readReceiptsHtml = '';
    if(isOwn) {
        readReceiptsHtml = `<span class="read-receipts ${isRead ? 'read' : 'sent'}">${isRead ? '✓✓' : '✓'}</span>`;
    }
    
    innerHtml += `<div class="time">${time}${readReceiptsHtml}</div>`;

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
    
    innerHtml += `</div>`; // Close .message wrapper

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


// --- Emoji Picker Logic --- 
const emojiBtn = document.getElementById('emoji-btn');
const emojiPickerWrapper = document.getElementById('emoji-picker-wrapper');
const emojiPicker = document.querySelector('emoji-picker');

if (emojiBtn && emojiPickerWrapper && emojiPicker) {
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPickerWrapper.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!emojiPickerWrapper.contains(e.target) && !emojiBtn.contains(e.target)) {
            emojiPickerWrapper.classList.add('hidden');
        }
    });

    emojiPicker.addEventListener('emoji-click', event => {
        const input = document.getElementById('msg-input');
        const cursorPosition = input.selectionStart;
        const textBefore = input.value.substring(0, cursorPosition);
        const textAfter  = input.value.substring(cursorPosition, input.value.length);
        input.value = textBefore + event.detail.unicode + textAfter;
        input.selectionStart = input.selectionEnd = cursorPosition + event.detail.unicode.length;
        input.focus();
    });
}
