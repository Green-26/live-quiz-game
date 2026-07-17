// ==================== UI NAVIGATION MODULE - COMPLETE FIXED ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==================== FIXED SETLOADING WITH PROPER ANIMATION ====================
function setLoading(show, text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (show) {
        loadingText.textContent = text;
        overlay.classList.remove('hidden');
        overlay.style.opacity = '1';
        // Update title for visual feedback
        document.title = `🔄 ${text}...`;
        setTimeout(() => {
            if (document.title.includes('🔄')) {
                document.title = '🌐 SmartQuiz Live';
            }
        }, 2000);
    } else {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
        document.title = '🌐 SmartQuiz Live';
    }
}

function show(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
}

function hide(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
}

function showError(id, message) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = message;
        el.classList.remove('hidden');
    }
}

function clearError(id) {
    const el = document.getElementById(id);
    if (el) {
        el.innerHTML = '';
        el.classList.add('hidden');
    }
}

function cleanupListeners() {
    if (unsubGame) { unsubGame(); unsubGame = null; }
    if (unsubPlayers) { unsubPlayers(); unsubPlayers = null; }
    if (unsubQuestion) { unsubQuestion(); unsubQuestion = null; }
    if (unsubScore) { unsubScore(); unsubScore = null; }
    if (questionTimerInterval) { clearTimeout(questionTimerInterval); questionTimerInterval = null; }
    if (studentTimerInterval) { clearInterval(studentTimerInterval); studentTimerInterval = null; }
}

function showHost() {
    hide('landingPage');
    show('hostPanel');
    hide('gameDashboard');
    hide('studentPanel');
    renderQuestionForm();
    renderQuestions();
}

function showStudent() {
    hide('landingPage');
    hide('hostPanel');
    hide('gameDashboard');
    show('studentPanel');
    document.getElementById('studentName').value = '';
    document.getElementById('gamePinStudent').value = '';
    clearError('joinError');
    hide('waitingArea');
    hide('quizArea');
    hide('resultsArea');
}

function backToLanding() {
    cleanupListeners();
    currentGameRef = null;
    myStudentId = null;
    isGameHost = false;
    currentPin = null;
    canAnswer = true;
    hasAnsweredCurrent = false;
    currentQuestionIndex = -1;
    lastQuestionVersion = null;

    hide('hostPanel');
    hide('gameDashboard');
    hide('studentPanel');
    hide('waitingArea');
    hide('quizArea');
    hide('resultsArea');
    show('landingPage');
    setLoading(false);
    document.title = '🌐 SmartQuiz Live';
}

console.log('✅ UI module loaded with fixes');