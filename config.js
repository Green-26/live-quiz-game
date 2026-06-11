// ==================== FIREBASE CONFIGURATION ====================
// REPLACE WITH YOUR FIREBASE PROJECT CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBNZHd8475afKLV2Wvl9qVcjUOpnJyokws",
  authDomain: "live-quiz-game-26.firebaseapp.com",
  projectId: "live-quiz-game-26",
  storageBucket: "live-quiz-game-26.firebasestorage.app",
  messagingSenderId: "816627971324",
  appId: "1:816627971324:web:bd827ff8428bb349a89379",
  measurementId: "G-N3ZKE80RRD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global Variables
let currentGameRef = null;
let currentQuestions = [];
let currentGamePin = null;
let unsubGame = null;
let unsubPlayers = null;
let activeQuestionListener = null;
let currentQuestionTimeout = null;
let currentHostId = null;

// Helper Functions
function setLoading(message) {
    const originalTitle = document.title;
    document.title = `🔄 ${message}...`;
    setTimeout(() => {
        if (document.title.includes('🔄')) {
            document.title = '🎯 SmartQuiz Live';
        }
    }, 2000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

console.log('✅ Firebase initialized');
console.log('Firestore:', db ? 'connected' : 'failed');
console.log('Auth:', auth ? 'connected' : 'failed');