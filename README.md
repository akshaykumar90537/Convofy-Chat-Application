# Convofy - Real-Time Chat Application 🚀

Convofy is a premium, real-time public chat application built with a focus on high-performance, security, and an exceptional user experience. It features a modern glassmorphism design, dynamic GSAP animations, and seamless real-time communication.

## ✨ Key Features

- **Real-Time Messaging**: Lightning-fast, real-time chat powered by WebSockets (Socket.io).
- **Premium UI/UX**: Stunning aesthetic using Glassmorphism, dynamic floating input labels, and fluid GSAP transitions.
- **Secure Authentication**: JWT-based stateless authentication system with secure login/registration flows.
- **Advanced Session Management**: 
  - Sessions automatically expire for security when the browser or tab is closed.
  - Seamless cross-tab synchronization allows you to open multiple tabs without needing to log in again.
- **Live Online Users**: A dedicated sidebar tracking the real-time presence of active users.
- **Light/Dark Mode Toggle**: Built-in theme switcher for personalized viewing preferences.
- **Rich Interaction**: Fully integrated Emoji Picker for expressive communication.
- **Fully Responsive**: Optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3 (Vanilla)
- JavaScript (ES6+)
- [GSAP](https://gsap.com/) (GreenSock Animation Platform) for advanced UI animations
- [Emoji-Picker-Element](https://github.com/nolanlawson/emoji-picker-element)

**Backend:**
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/) (Web framework)
- [Socket.io](https://socket.io/) (Real-time bidirectional event-based communication)
- [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/) (Database & ODM)
- JSON Web Tokens (JWT) & bcryptjs (Security)

## 🚀 How to Run Locally

Follow these steps to set up and run the Convofy application on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your machine.
- A [MongoDB](https://www.mongodb.com/cloud/atlas) database URI.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akshaykumar90537/Convofy-Chat-Application.git
   cd Convofy-Chat-Application
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following details:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_jwt_key
   ```

4. **Start the server:**
   ```bash
   npm start
   ```
   *(Note: You can also use `node server.js` or `nodemon server.js` for development)*

5. **Open the App:**
   Visit `http://localhost:3000` in your browser.

## 📂 Project Structure

```text
Convofy-Chat-Application/
├── models/                # Mongoose Database Models
│   ├── Conversation.js    # Conversation schema
│   ├── Message.js         # Message schema
│   └── User.js            # User authentication schema
├── public/                # Frontend assets
│   ├── index.html         # Main UI structure
│   ├── style.css          # Styling (Glassmorphism & animations)
│   ├── script.js          # Client-side logic & Socket.io events
│   └── uploads/           # Directory for uploaded files/media
├── server.js              # Node.js backend & Socket.io server
├── package.json           # Project dependencies & scripts
├── login-stitch.html      # Alternative UI file
└── .env                   # Environment variables (not tracked in Git)
```

## 🔮 Future Roadmap
Here are some features planned for future updates:
- [ ] **Private Messaging**: Direct 1-on-1 chats between users.
- [ ] **Typing Indicators**: See when someone is currently typing a message.
- [ ] **Read Receipts**: Know when your messages have been seen.
- [ ] **Media Sharing**: Ability to send images and files in the chat.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

## 📝 License
This project is open-source and available under the MIT License.

## Author
Akshay Kumar
