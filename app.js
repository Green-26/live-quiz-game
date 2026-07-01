// ==================== APP.JS - MAIN ENTRY POINT ====================

// All global variables from config.js are available
// All functions from other modules are available

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SmartQuiz Live v2.0 starting...');

    // Initialize 3D background
    init3D();

    // Navigation
    document.getElementById('hostBtn').onclick = showHost;
    document.getElementById('studentJoinBtn').onclick = showStudent;
    document.getElementById('backHostBtn').onclick = backToLanding;
    document.getElementById('backStudentBtn').onclick = backToLanding;
    document.getElementById('exitControl').onclick = backToLanding;

    // Host panel
    document.getElementById('addQBtn').onclick = addQuestion;
    document.getElementById('sampleBtn').onclick = addSamples;
    document.getElementById('clearBtn').onclick = clearQuestions;
    document.getElementById('qType').onchange = renderQuestionForm;
    document.getElementById('createGameBtn').onclick = createGame;

    // Game controls
    document.getElementById('startGameControl').onclick = startGame;
    document.getElementById('nextControl').onclick = nextQuestion;
    document.getElementById('endControl').onclick = endGame;

    // Student
    document.getElementById('joinGameControl').onclick = joinGame;

    // Enter key support
    document.getElementById('studentName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
    document.getElementById('gamePinStudent').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // Render initial form
    renderQuestionForm();

    // Check for session restore
    restoreActiveSession();

    console.log('✅ SmartQuiz Live v2.0 ready!');
});

console.log('✅ App module loaded');
