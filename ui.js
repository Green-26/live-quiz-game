// ==================== UI NAVIGATION ====================

function showLandingPage() {
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('teacherDashboard').classList.add('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.add('hidden');
}

function showTeacherDashboard() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('teacherDashboard').classList.remove('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.add('hidden');
    renderQuestionsList();
}

function showStudentJoin() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('teacherDashboard').classList.add('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.remove('hidden');
    document.getElementById('studentWaitingArea').classList.add('hidden');
    document.getElementById('studentQuizArea').classList.add('hidden');
    document.getElementById('studentResultsArea').classList.add('hidden');
    document.getElementById('studentNameInput').value = '';
    document.getElementById('gamePinInput').value = '';
    document.getElementById('joinError').innerText = '';
}

function backToLanding() {
    // Clean up listeners
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    if (activeQuestionListener) activeQuestionListener();
    if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
    
    showLandingPage();
}

// Event Listeners Setup
function setupUIListeners() {
    document.getElementById('teacherDashboardBtn')?.addEventListener('click', () => {
        loadQuestionsFromLocal();
        showTeacherDashboard();
    });
    
    document.getElementById('studentJoinBtn')?.addEventListener('click', showStudentJoin);
    document.getElementById('backToLandingBtn')?.addEventListener('click', backToLanding);
    document.getElementById('backToLandingFromStudentBtn')?.addEventListener('click', backToLanding);
    
    document.getElementById('addQuestionBtn')?.addEventListener('click', addQuestion);
    document.getElementById('addSampleBtn')?.addEventListener('click', addSampleQuestions);
    document.getElementById('clearQuestionsBtn')?.addEventListener('click', clearAllQuestions);
    document.getElementById('questionType')?.addEventListener('change', renderQuestionForm);
    
    document.getElementById('createGameAndHostBtn')?.addEventListener('click', createGameAndHost);
    document.getElementById('startGameBtn')?.addEventListener('click', startGame);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('endGameBtn')?.addEventListener('click', endGame);
    document.getElementById('previewGameBtn')?.addEventListener('click', previewGameQuestions);
    
    document.getElementById('joinGameBtn')?.addEventListener('click', joinGameAsStudent);
    
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
    
    // Enter key for join
    document.getElementById('gamePinInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGameAsStudent();
    });
    document.getElementById('studentNameInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGameAsStudent();
    });
}