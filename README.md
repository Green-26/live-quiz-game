# 🎯 SmartQuiz Live - Multi-Question Type Quiz Game

A real-time, multiplayer quiz game with 7 different question types, live leaderboard, and Firebase backend.

## ✨ Features

### Question Types
- ✅ Multiple Choice (A/B/C/D)
- ✅ True / False
- ✅ Fill in the Blank
- ✅ Matching Pairs
- ✅ Ordering / Sequencing
- ✅ Numeric Answer (with tolerance)
- ✅ Essay/Open-ended (coming soon)

### Game Features
- 🎮 Host creates game, generates PIN
- 👥 Players join with PIN and name
- ⏱️ Timed questions (15 seconds)
- 🏆 Speed-based scoring
- 📊 Live leaderboard
- 🔄 Real-time synchronization
- 📱 Mobile responsive

## 🚀 Quick Start

### Prerequisites
1. Firebase account (free tier)
2. Node.js (optional, for local server)

### Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project
   - Enable Anonymous Authentication
   - Create Firestore Database (test mode)

2. **Get Firebase Config**
   - Project Settings → General
   - Copy firebaseConfig object

3. **Update Configuration**
   - Open `js/firebase-config.js`
   - Replace with your config

4. **Run the Game**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # OR using Node.js
   npx live-server
   
   # OR just open index.html