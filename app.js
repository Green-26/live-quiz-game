// ==================== MAIN APPLICATION ====================
// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize question form
    renderQuestionForm();
    
    // Try to restore existing session
    restoreSession().then(restored => {
        if (!restored) {
            // Show auth section if no session
            document.getElementById('authSection').classList.remove('hidden');
            document.getElementById('hostPanel').classList.add('hidden');
            document.getElementById('playerPanel').classList.add('hidden');
        }
    });
    
    // Set up event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Auth buttons
    const joinBtn = document.getElementById('joinGameBtn');
    const hostBtn = document.getElementById('hostGameBtn');
    
    if (joinBtn) joinBtn.addEventListener('click', joinGame);
    if (hostBtn) hostBtn.addEventListener('click', hostNewGame);
    
    // Host controls
    const startBtn = document.getElementById('startGameBtn');
    const nextBtn = document.getElementById('nextQuestionBtn');
    const endBtn = document.getElementById('endGameBtn');
    const addQBtn = document.getElementById('addQuestionBtn');
    const typeSelect = document.getElementById('questionTypeSelect');
    
    if (startBtn) startBtn.addEventListener('click', startGame);
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
    if (endBtn) endBtn.addEventListener('click', endGame);
    if (addQBtn) addQBtn.addEventListener('click', addQuestion);
    if (typeSelect) typeSelect.addEventListener('change', renderQuestionForm);
    
    // Enter key support
    const pinInput = document.getElementById('gamePinInput');
    const nameInput = document.getElementById('playerNameInput');
    
    if (pinInput) {
        pinInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinGame();
        });
    }
    
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') joinGame();
        });
    }
}

// ==================== EXPORT FUNCTIONS (Global Scope) ====================
// Make necessary functions available globally for inline event handlers
window.joinGame = joinGame;
window.hostNewGame = hostNewGame;
window.startGame = startGame;
window.nextQuestion = nextQuestion;
window.endGame = endGame;
window.addQuestion = addQuestion;
window.logout = logout;