// ==================== FIREBASE CONFIGURATION ====================
// REPLACE THIS WITH YOUR FIREBASE PROJECT CONFIGURATION
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

// Export Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Global state
let currentUser = null;
let currentGameRef = null;
let unsubGame = null;
let unsubPlayers = null;
let activeQuestionListener = null;
let activeTimeout = null;
let currentQuestions = [];