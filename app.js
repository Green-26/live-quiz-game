// ==================== APP.JS - MAIN ENTRY POINT ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 SmartQuiz Live v2.0 starting...');

    init3D();

    // Navigation
    document.getElementById('hostBtn').onclick = showHost;
    document.getElementById('studentJoinBtn').onclick = showStudent;
    document.getElementById('backHostBtn').onclick = backToLanding;
    document.getElementById('backStudentBtn').onclick = backToLanding;
    document.getElementById('exitControl').onclick = backToLanding;

    // Host panel - Question creation
    document.getElementById('addQBtn').onclick = addQuestion;
    document.getElementById('sampleBtn').onclick = addSamples;
    document.getElementById('clearBtn').onclick = clearQuestions;
    document.getElementById('qType').onchange = renderQuestionForm;
    document.getElementById('createGameBtn').onclick = createGame;

    // Game controls with loading animations
    document.getElementById('startGameControl').onclick = function() {
        setLoading(true, '▶ Starting game...');
        startGame();
    };
    
    document.getElementById('nextControl').onclick = function() {
        setLoading(true, '🔄 Sending question to students...');
        nextQuestion();
    };
    
    document.getElementById('endControl').onclick = function() {
        setLoading(true, '⏹ Ending game...');
        endGame();
    };

    // Student join with loading animation
    document.getElementById('joinGameControl').onclick = function() {
        setLoading(true, '🔗 Connecting to game...');
        joinGame();
    };

    // Enter key support with loading animation
    document.getElementById('studentName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setLoading(true, '🔗 Connecting to game...');
            joinGame();
        }
    });
    document.getElementById('gamePinStudent').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setLoading(true, '🔗 Connecting to game...');
            joinGame();
        }
    });

    renderQuestionForm();
    restoreActiveSession();

    console.log('✅ SmartQuiz Live v2.0 ready!');
});

console.log('✅ App module loaded');