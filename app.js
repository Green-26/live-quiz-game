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

    // Game controls
    document.getElementById('startGameControl').onclick = startGame;
    document.getElementById('nextControl').onclick = nextQuestion;
    document.getElementById('endControl').onclick = endGame;

    // Student
    document.getElementById('joinGameControl').onclick = function() {
        setLoading(true, 'Joining game...');
        joinGame();
    };

    document.getElementById('studentName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setLoading(true, 'Joining game...');
            joinGame();
        }
    });
    document.getElementById('gamePinStudent').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setLoading(true, 'Joining game...');
            joinGame();
        }
    });

    renderQuestionForm();
    restoreActiveSession();

    console.log('✅ SmartQuiz Live v2.0 ready!');
});

console.log('✅ App module loaded');