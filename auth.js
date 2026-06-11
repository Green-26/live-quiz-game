// ==================== UI SWITCH FUNCTIONS ====================
function switchToHost(pin) {
    const authSection = document.getElementById('authSection');
    const hostPanel = document.getElementById('hostPanel');
    const playerPanel = document.getElementById('playerPanel');
    
    if (authSection) authSection.classList.add('hidden');
    if (hostPanel) {
        hostPanel.classList.remove('hidden');
        hostPanel.style.display = 'block';
    }
    if (playerPanel) playerPanel.classList.add('hidden');
    
    const hostPin = document.getElementById('hostPin');
    if (hostPin) hostPin.innerText = pin;
    
    renderQuestionForm();
}

function switchToPlayer(pin, name) {
    const authSection = document.getElementById('authSection');
    const hostPanel = document.getElementById('hostPanel');
    const playerPanel = document.getElementById('playerPanel');
    
    if (authSection) authSection.classList.add('hidden');
    if (hostPanel) hostPanel.classList.add('hidden');
    if (playerPanel) {
        playerPanel.classList.remove('hidden');
        playerPanel.style.display = 'block';
    }
    
    const playerNameSpan = document.getElementById('playerName');
    const playerPinSpan = document.getElementById('playerPin');
    const playerScoreSpan = document.getElementById('playerScore');
    
    if (playerNameSpan) playerNameSpan.innerText = name;
    if (playerPinSpan) playerPinSpan.innerText = pin;
    if (playerScoreSpan) playerScoreSpan.innerText = '0';
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
        console.error('Restore error:', error);
    }
    return false;
}