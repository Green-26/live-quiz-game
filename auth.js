// ==================== UI SWITCH FUNCTIONS ====================
function switchToHost(pin) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('hostPanel').classList.remove('hidden');
    document.getElementById('playerPanel').classList.add('hidden');
    document.getElementById('hostPin').innerText = pin;
    renderQuestionForm();
}

function switchToPlayer(pin, name) {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('hostPanel').classList.add('hidden');
    document.getElementById('playerPanel').classList.remove('hidden');
    document.getElementById('playerName').innerText = name;
    document.getElementById('playerPin').innerText = pin;
    document.getElementById('playerScore').innerText = '0';
    document.getElementById('waitingArea').classList.remove('hidden');
    document.getElementById('quizArea').classList.add('hidden');
}

// ==================== SESSION RESTORATION ====================
async function restoreSession() {
    const stored = sessionStorage.getItem('quizUser');
    if (!stored) return false;
    
    try {
        const user = JSON.parse(stored);
        const gameRef = db.collection('games').doc(user.gameId);
        const doc = await gameRef.get();
        
        if (doc.exists) {
            currentUser = user;
            currentGameRef = gameRef;
            
            if (user.isHost) {
                switchToHost(user.gameId);
                attachHostListeners(gameRef);
            } else {
                switchToPlayer(user.gameId, user.playerName);
                attachPlayerListeners(gameRef, user.uid);
            }
            return true;
        }
    } catch (error) {
        console.error('Error restoring session:', error);
    }
    
    return false;
}

// ==================== LOGOUT ====================
async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('quizUser');
        if (unsubGame) unsubGame();
        if (unsubPlayers) unsubPlayers();
        if (activeQuestionListener) activeQuestionListener();
        if (activeTimeout) clearTimeout(activeTimeout);
        
        window.location.reload();
    }
}