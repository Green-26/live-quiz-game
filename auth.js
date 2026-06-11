// ==================== AUTH & UI FUNCTIONS ====================
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
    document.getElementById('playerNameDisplay').innerText = name;
    document.getElementById('playerPinDisplay').innerText = pin;
    document.getElementById('playerScoreDisplay').innerText = '0';
}

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
            playerId = user.uid;
            
            if (user.isHost) {
                switchToHost(user.gameId);
                attachHostListeners(gameRef);
            } else {
                switchToPlayer(user.gameId, user.playerName);
                attachPlayerListeners(gameRef);
            }
            return true;
        }
    } catch (error) {
        console.error(error);
    }
    return false;
}