// ==================== UI NAVIGATION MODULE ====================

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
    }, 3000);
}

function setLoading(show, text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (show) {
        loadingText.textContent = text;
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
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
    if (currentQuestionTimeout) { clearTimeout(currentQuestionTimeout); currentQuestionTimeout = null; }
    if (window.timerInt) { clearInterval(window.timerInt); window.timerInt = null; }
}

// Navigation functions
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

    hide('hostPanel');
    hide('gameDashboard');
    hide('studentPanel');
    hide('waitingArea');
    hide('quizArea');
    hide('resultsArea');
    show('landingPage');
}
