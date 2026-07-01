// ==================== AUTHENTICATION MODULE ====================

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
    cleanupListeners();
}

// Auto-restore session on page load
async function restoreActiveSession() {
    const session = await checkActiveSession();
    if (!session) return false;

    const gameRef = db.collection('games').doc(session.pin);
    const gameDoc = await gameRef.get();

    if (!gameDoc.exists) return false;

    currentGameRef = gameRef;
    currentPin = session.pin;

    if (session.isHost) {
        // Restore host view
        hide('landingPage');
        hide('hostPanel');
        show('gameDashboard');
        hide('studentPanel');
        document.getElementById('gamePin').innerText = session.pin;

        // Load questions into myQuestions
        const gameData = gameDoc.data();
        myQuestions = gameData.questions || [];

        // Reattach host listeners
        // This would need the full game-host logic
        return true;
    } else {
        // Restore player view
        hide('landingPage');
        hide('hostPanel');
        hide('gameDashboard');
        show('studentPanel');
        return true;
    }
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

    try {
        await auth.signOut();
    } catch (error) {
        console.error('Sign out error:', error);
    }

    backToLanding();
    myQuestions = [];
    renderQuestions();
    showToast('Logged out', 'info');
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
