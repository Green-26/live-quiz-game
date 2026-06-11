// ==================== AUTHENTICATION & SESSION ====================

// Check if user has an active session
async function checkActiveSession() {
    const stored = sessionStorage.getItem('activeGameSession');
    if (!stored) return null;
    
    try {
        const session = JSON.parse(stored);
        const gameRef = db.collection('games').doc(session.pin);
        const gameDoc = await gameRef.get();
        
        if (gameDoc.exists && gameDoc.data().status !== 'ended') {
            return session;
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
    return null;
}

// Save active session
function saveSession(pin, isHost) {
    sessionStorage.setItem('activeGameSession', JSON.stringify({
        pin: pin,
        isHost: isHost,
        timestamp: Date.now()
    }));
}

// Clear session
function clearSession() {
    sessionStorage.removeItem('activeGameSession');
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    if (activeQuestionListener) activeQuestionListener();
    if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
}

// Auto-restore session on page load
async function restoreActiveSession() {
    const session = await checkActiveSession();
    if (!session) return false;
    
    const gameRef = db.collection('games').doc(session.pin);
    const gameDoc = await gameRef.get();
    
    if (!gameDoc.exists) return false;
    
    currentGameRef = gameRef;
    currentGamePin = session.pin;
    
    if (session.isHost) {
        // Restore host view
        document.getElementById('landingPage').classList.add('hidden');
        document.getElementById('teacherDashboard').classList.add('hidden');
        document.getElementById('activeGameDashboard').classList.remove('hidden');
        document.getElementById('studentJoinPage').classList.add('hidden');
        document.getElementById('gamePinDisplay').innerText = session.pin;
        
        // Load questions into currentQuestions
        const gameData = gameDoc.data();
        currentQuestions = gameData.questions || [];
        
        attachGameListeners(gameRef);
    } else {
        // Restore player view
        document.getElementById('landingPage').classList.add('hidden');
        document.getElementById('teacherDashboard').classList.add('hidden');
        document.getElementById('activeGameDashboard').classList.add('hidden');
        document.getElementById('studentJoinPage').classList.remove('hidden');
        document.getElementById('studentWaitingArea').classList.add('hidden');
        document.getElementById('studentQuizArea').classList.add('hidden');
        
        // Find player ID from localStorage
        const playerId = localStorage.getItem('studentPlayerId');
        if (playerId) {
            playerId = playerId;
            attachStudentListeners(gameRef);
        }
    }
    
    return true;
}

// Anonymous sign in helper
async function ensureAnonymousAuth() {
    if (auth.currentUser) return auth.currentUser;
    
    try {
        const userCredential = await auth.signInAnonymously();
        return userCredential.user;
    } catch (error) {
        console.error('Auth error:', error);
        throw error;
    }
}

// Logout and clear all sessions
async function logoutAndClear() {
    clearSession();
    localStorage.removeItem('teacherQuiz');
    localStorage.removeItem('studentPlayerId');
    sessionStorage.removeItem('activeGameSession');
    
    // Sign out from Firebase
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
    }
    
    // Reset UI
    showLandingPage();
    currentQuestions = [];
    renderQuestionsList();
    
    console.log('Logged out and cleared all data');
}

// Listen to auth state changes
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('Authenticated:', user.uid);
    } else {
        console.log('Not authenticated');
    }
});

console.log('✅ Auth module loaded');