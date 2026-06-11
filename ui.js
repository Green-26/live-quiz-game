// ==================== UI NAVIGATION WITH FIREBASE ====================

let directHostQuestions = [];

function showLandingPage() {
    document.getElementById('landingPage').classList.remove('hidden');
    document.getElementById('teacherDashboard').classList.add('hidden');
    document.getElementById('directHostPanel').classList.add('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.add('hidden');
}

function showTeacherDashboard() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('teacherDashboard').classList.remove('hidden');
    document.getElementById('directHostPanel').classList.add('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.add('hidden');
    renderQuestionsList();
}

async function showDirectHostPanel() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('teacherDashboard').classList.add('hidden');
    document.getElementById('directHostPanel').classList.remove('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.add('hidden');
    
    // Load saved questions
    const saved = localStorage.getItem('directHostQuestions');
    if (saved) {
        directHostQuestions = JSON.parse(saved);
    } else {
        directHostQuestions = [];
    }
    renderDirectQuestionsList();
    renderDirectQuestionForm();
}

function showStudentJoin() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('teacherDashboard').classList.add('hidden');
    document.getElementById('directHostPanel').classList.add('hidden');
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
    clearGameSession();
    showLandingPage();
}

// ==================== DIRECT HOST QUESTION FUNCTIONS ====================

function renderDirectQuestionForm() {
    const type = document.getElementById('directQuestionType').value;
    const container = document.getElementById('directQuestionFormContainer');
    
    let html = '<input type="text" id="directQuestionText" class="input-field mb-20" placeholder="Enter your question...">';
    
    if (type === 'multiple_choice') {
        html += `
            <input type="text" id="directOpt1" class="input-field mb-20" placeholder="Option A">
            <input type="text" id="directOpt2" class="input-field mb-20" placeholder="Option B">
            <input type="text" id="directOpt3" class="input-field mb-20" placeholder="Option C">
            <input type="text" id="directOpt4" class="input-field mb-20" placeholder="Option D">
            <select id="directCorrectOpt" class="input-field mb-20">
                <option value="0">Option A is correct</option>
                <option value="1">Option B is correct</option>
                <option value="2">Option C is correct</option>
                <option value="3">Option D is correct</option>
            </select>
        `;
    } else if (type === 'true_false') {
        html += `
            <select id="directCorrectOpt" class="input-field mb-20">
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        `;
    } else if (type === 'fill_blank') {
        html += `<input type="text" id="directCorrectAnswer" class="input-field mb-20" placeholder="Correct answer">`;
    } else if (type === 'numeric') {
        html += `
            <input type="number" id="directCorrectValue" class="input-field mb-20" placeholder="Correct answer">
            <input type="text" id="directUnit" class="input-field mb-20" placeholder="Unit (optional)">
        `;
    }
    
    html += `
        <input type="text" id="directExplanation" class="input-field mb-20" placeholder="Explanation (optional)">
        <input type="number" id="directPoints" class="input-field" placeholder="Points" value="100">
    `;
    
    container.innerHTML = html;
}

function buildDirectQuestion() {
    const type = document.getElementById('directQuestionType').value;
    const text = document.getElementById('directQuestionText')?.value.trim();
    const difficulty = document.getElementById('directDifficulty').value;
    const subject = document.getElementById('directSubject').value;
    const points = parseInt(document.getElementById('directPoints')?.value) || 100;
    const explanation = document.getElementById('directExplanation')?.value || '';
    
    if (!text) {
        alert('Please enter a question');
        return null;
    }
    
    const question = {
        id: Date.now(),
        type: type,
        text: text,
        difficulty: difficulty,
        subject: subject,
        points: points,
        explanation: explanation
    };
    
    if (type === 'multiple_choice') {
        const opt1 = document.getElementById('directOpt1')?.value.trim();
        const opt2 = document.getElementById('directOpt2')?.value.trim();
        const opt3 = document.getElementById('directOpt3')?.value.trim();
        const opt4 = document.getElementById('directOpt4')?.value.trim();
        
        if (!opt1 || !opt2 || !opt3 || !opt4) {
            alert('All options are required');
            return null;
        }
        
        question.options = [opt1, opt2, opt3, opt4];
        question.correctAnswer = parseInt(document.getElementById('directCorrectOpt').value);
    } else if (type === 'true_false') {
        question.correctAnswer = document.getElementById('directCorrectOpt').value === 'true';
    } else if (type === 'fill_blank') {
        const correct = document.getElementById('directCorrectAnswer')?.value.trim();
        if (!correct) {
            alert('Correct answer is required');
            return null;
        }
        question.correctAnswer = correct;
    } else if (type === 'numeric') {
        const correct = parseFloat(document.getElementById('directCorrectValue')?.value);
        if (isNaN(correct)) {
            alert('Correct answer is required');
            return null;
        }
        question.correctAnswer = correct;
        question.unit = document.getElementById('directUnit')?.value || '';
        question.tolerance = 0;
    }
    
    return question;
}

function addDirectQuestion() {
    const question = buildDirectQuestion();
    if (!question) return;
    
    directHostQuestions.push(question);
    renderDirectQuestionsList();
    localStorage.setItem('directHostQuestions', JSON.stringify(directHostQuestions));
    
    // Clear form
    document.getElementById('directQuestionText').value = '';
    if (document.getElementById('directOpt1')) document.getElementById('directOpt1').value = '';
    if (document.getElementById('directOpt2')) document.getElementById('directOpt2').value = '';
    if (document.getElementById('directOpt3')) document.getElementById('directOpt3').value = '';
    if (document.getElementById('directOpt4')) document.getElementById('directOpt4').value = '';
    
    alert('Question added!');
}

function renderDirectQuestionsList() {
    const container = document.getElementById('directQuestionsList');
    
    if (!directHostQuestions || directHostQuestions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#718096; padding:20px;">📭 No questions yet. Add some above!</p>';
        return;
    }
    
    container.innerHTML = directHostQuestions.map((q, i) => `
        <div class="question-item">
            <div>
                <span class="question-badge">${q.type.replace('_', ' ')}</span>
                <strong>Q${i+1}:</strong> ${escapeHtml(q.text.substring(0, 50))}
                <span style="margin-left:10px;">🎯 ${q.points} pts</span>
            </div>
            <button class="remove-direct-btn" data-index="${i}">✖ Remove</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-direct-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (confirm('Remove this question?')) {
                directHostQuestions.splice(index, 1);
                renderDirectQuestionsList();
                localStorage.setItem('directHostQuestions', JSON.stringify(directHostQuestions));
            }
        });
    });
}

function addDirectSampleQuestions() {
    const samples = [
        { id: Date.now()+1, type: 'multiple_choice', text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correctAnswer: 1, difficulty: 'easy', subject: 'geography', points: 100, explanation: 'Paris is the capital of France' },
        { id: Date.now()+2, type: 'true_false', text: 'The Earth is flat', correctAnswer: false, difficulty: 'easy', subject: 'science', points: 50, explanation: 'The Earth is actually round' },
        { id: Date.now()+3, type: 'numeric', text: 'What is 15 + 27?', correctAnswer: 42, difficulty: 'easy', subject: 'math', points: 75 },
        { id: Date.now()+4, type: 'fill_blank', text: 'Water freezes at ______ degrees Celsius', correctAnswer: '0', difficulty: 'easy', subject: 'science', points: 50 }
    ];
    
    directHostQuestions.push(...samples);
    renderDirectQuestionsList();
    localStorage.setItem('directHostQuestions', JSON.stringify(directHostQuestions));
    alert(`Added ${samples.length} sample questions!`);
}

function clearDirectQuestions() {
    if (confirm('⚠️ Clear ALL questions?')) {
        directHostQuestions = [];
        renderDirectQuestionsList();
        localStorage.setItem('directHostQuestions', JSON.stringify(directHostQuestions));
        alert('All questions cleared');
    }
}

// ==================== FINALIZE HOST GAME ====================

async function finalizeAndHostGame() {
    if (!directHostQuestions.length) {
        alert('Please add some questions first!');
        return;
    }
    
    // Create game in Firebase
    const result = await directHostNewGame(directHostQuestions);
    
    if (result.success) {
        // Switch to active game dashboard
        document.getElementById('directHostPanel').classList.add('hidden');
        document.getElementById('activeGameDashboard').classList.remove('hidden');
        document.getElementById('gamePinDisplay').innerText = result.pin;
        document.getElementById('gameStatusMessage').innerHTML = '📌 Game created! Share this PIN with students. Click START GAME when ready.';
        
        // Attach Firebase listeners
        await attachGameListeners(result.gameRef);
    }
}

// ==================== CREATE GAME FROM TEACHER DASHBOARD ====================

async function createGameAndHost() {
    if (!currentQuestions.length) {
        alert('Please add some questions first!');
        return;
    }
    
    const result = await directHostNewGame(currentQuestions);
    
    if (result.success) {
        document.getElementById('teacherDashboard').classList.add('hidden');
        document.getElementById('activeGameDashboard').classList.remove('hidden');
        document.getElementById('gamePinDisplay').innerText = result.pin;
        document.getElementById('gameStatusMessage').innerHTML = '📌 Game created! Share this PIN with students. Click START GAME when ready.';
        
        await attachGameListeners(result.gameRef);
    }
}

// ==================== SETUP ALL EVENT LISTENERS ====================

function setupUIListeners() {
    console.log('Setting up UI listeners...');
    
    // Main navigation buttons
    const teacherBtn = document.getElementById('teacherDashboardBtn');
    const hostBtn = document.getElementById('hostNewGameBtn');
    const studentBtn = document.getElementById('studentJoinBtn');
    
    if (teacherBtn) teacherBtn.addEventListener('click', () => {
        loadQuestionsFromLocal();
        showTeacherDashboard();
    });
    
    if (hostBtn) {
        hostBtn.addEventListener('click', () => {
            console.log('Host New Game clicked');
            showDirectHostPanel();
        });
    }
    
    if (studentBtn) studentBtn.addEventListener('click', showStudentJoin);
    
    // Back buttons
    const backToLandingBtn = document.getElementById('backToLandingBtn');
    const backFromDirectHost = document.getElementById('backFromDirectHostBtn');
    const backFromStudent = document.getElementById('backToLandingFromStudentBtn');
    const exitGameBtn = document.getElementById('exitGameBtn');
    
    if (backToLandingBtn) backToLandingBtn.addEventListener('click', backToLanding);
    if (backFromDirectHost) backFromDirectHost.addEventListener('click', backToLanding);
    if (backFromStudent) backFromStudent.addEventListener('click', backToLanding);
    if (exitGameBtn) exitGameBtn.addEventListener('click', backToLanding);
    
    // Teacher dashboard question buttons
    const addQBtn = document.getElementById('addQuestionBtn');
    const sampleBtn = document.getElementById('addSampleBtn');
    const clearBtn = document.getElementById('clearQuestionsBtn');
    const typeSelect = document.getElementById('questionType');
    const createGameBtn = document.getElementById('createGameAndHostBtn');
    
    if (addQBtn) addQBtn.addEventListener('click', addQuestion);
    if (sampleBtn) sampleBtn.addEventListener('click', addSampleQuestions);
    if (clearBtn) clearBtn.addEventListener('click', clearAllQuestions);
    if (typeSelect) typeSelect.addEventListener('change', renderQuestionForm);
    if (createGameBtn) createGameBtn.addEventListener('click', createGameAndHost);
    
    // Direct host panel buttons
    const directAddBtn = document.getElementById('directAddQuestionBtn');
    const directSampleBtn = document.getElementById('directAddSampleBtn');
    const directClearBtn = document.getElementById('directClearQuestionsBtn');
    const directTypeSelect = document.getElementById('directQuestionType');
    const finalizeBtn = document.getElementById('finalizeHostGameBtn');
    
    if (directAddBtn) directAddBtn.addEventListener('click', addDirectQuestion);
    if (directSampleBtn) directSampleBtn.addEventListener('click', addDirectSampleQuestions);
    if (directClearBtn) directClearBtn.addEventListener('click', clearDirectQuestions);
    if (directTypeSelect) directTypeSelect.addEventListener('change', renderDirectQuestionForm);
    if (finalizeBtn) finalizeBtn.addEventListener('click', finalizeAndHostGame);
    
    // Game control buttons
    const startGameBtn = document.getElementById('startGameBtn');
    const nextQBtn = document.getElementById('nextQuestionBtn');
    const endGameBtn = document.getElementById('endGameBtn');
    const previewBtn = document.getElementById('previewGameBtn');
    
    if (startGameBtn) startGameBtn.addEventListener('click', startGame);
    if (nextQBtn) nextQBtn.addEventListener('click', nextQuestion);
    if (endGameBtn) endGameBtn.addEventListener('click', endGame);
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            if (currentQuestions.length) {
                previewQuestions(currentQuestions);
            } else if (directHostQuestions.length) {
                previewQuestions(directHostQuestions);
            } else {
                alert('No questions to preview');
            }
        });
    }
    
    // Student join button
    const joinBtn = document.getElementById('joinGameBtn');
    if (joinBtn) joinBtn.addEventListener('click', joinGameAsStudent);
    
    // Modal close buttons
    const closeModal1 = document.getElementById('closeModal');
    const closeModal2 = document.getElementById('closeModalBtn');
    if (closeModal1) closeModal1.addEventListener('click', closeModal);
    if (closeModal2) closeModal2.addEventListener('click', closeModal);
    
    // Enter key for join
    const pinInput = document.getElementById('gamePinInput');
    const nameInput = document.getElementById('studentNameInput');
    if (pinInput) pinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') joinGameAsStudent(); });
    if (nameInput) nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') joinGameAsStudent(); });
    
    // Initialize forms
    renderQuestionForm();
    renderDirectQuestionForm();
    
    console.log('✅ All UI listeners attached');
}

// Save teacher questions to localStorage
function saveQuestionsToLocal() {
    localStorage.setItem('teacherQuiz', JSON.stringify(currentQuestions));
}

function loadQuestionsFromLocal() {
    const saved = localStorage.getItem('teacherQuiz');
    if (saved) {
        currentQuestions = JSON.parse(saved);
        renderQuestionsList();
    } else {
        currentQuestions = [];
    }
}

function renderQuestionsList() {
    const container = document.getElementById('questionsListContainer');
    if (!container) return;
    
    if (!currentQuestions || currentQuestions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#718096; padding:20px;">📭 No questions yet. Add some above!</p>';
        return;
    }
    
    container.innerHTML = currentQuestions.map((q, i) => `
        <div class="question-item">
            <div>
                <span class="question-badge">${q.type.replace('_', ' ')}</span>
                <strong>Q${i+1}:</strong> ${escapeHtml(q.text.substring(0, 50))}
                <span style="margin-left:10px;">🎯 ${q.points} pts</span>
            </div>
            <button class="remove-teacher-btn" data-index="${i}">✖ Remove</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-teacher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (confirm('Remove this question?')) {
                currentQuestions.splice(index, 1);
                renderQuestionsList();
                saveQuestionsToLocal();
            }
        });
    });
}

function addQuestion() {
    const question = buildQuestion();
    if (!question) return;
    
    currentQuestions.push(question);
    renderQuestionsList();
    saveQuestionsToLocal();
    
    document.getElementById('questionText').value = '';
    if (document.getElementById('opt1')) document.getElementById('opt1').value = '';
    if (document.getElementById('opt2')) document.getElementById('opt2').value = '';
    if (document.getElementById('opt3')) document.getElementById('opt3').value = '';
    if (document.getElementById('opt4')) document.getElementById('opt4').value = '';
    
    alert('Question added!');
}

function addSampleQuestions() {
    const samples = [
        { id: Date.now()+1, type: 'multiple_choice', text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correctAnswer: 1, difficulty: 'easy', subject: 'geography', points: 100, explanation: 'Paris is the capital of France' },
        { id: Date.now()+2, type: 'true_false', text: 'The Earth is flat', correctAnswer: false, difficulty: 'easy', subject: 'science', points: 50, explanation: 'The Earth is actually round' },
        { id: Date.now()+3, type: 'numeric', text: 'What is 15 + 27?', correctAnswer: 42, difficulty: 'easy', subject: 'math', points: 75 },
        { id: Date.now()+4, type: 'fill_blank', text: 'Water freezes at ______ degrees Celsius', correctAnswer: '0', difficulty: 'easy', subject: 'science', points: 50 }
    ];
    
    currentQuestions.push(...samples);
    renderQuestionsList();
    saveQuestionsToLocal();
    alert(`Added ${samples.length} sample questions!`);
}

function clearAllQuestions() {
    if (confirm('⚠️ Clear ALL questions?')) {
        currentQuestions = [];
        renderQuestionsList();
        saveQuestionsToLocal();
        alert('All questions cleared');
    }
}

function buildQuestion() {
    const type = document.getElementById('questionType').value;
    const text = document.getElementById('questionText')?.value.trim();
    const difficulty = document.getElementById('difficulty').value;
    const subject = document.getElementById('subject').value;
    const points = parseInt(document.getElementById('points')?.value) || 100;
    const explanation = document.getElementById('explanation')?.value || '';
    
    if (!text) {
        alert('Please enter a question');
        return null;
    }
    
    const question = {
        id: Date.now(),
        type: type,
        text: text,
        difficulty: difficulty,
        subject: subject,
        points: points,
        explanation: explanation
    };
    
    if (type === 'multiple_choice') {
        const opt1 = document.getElementById('opt1')?.value.trim();
        const opt2 = document.getElementById('opt2')?.value.trim();
        const opt3 = document.getElementById('opt3')?.value.trim();
        const opt4 = document.getElementById('opt4')?.value.trim();
        
        if (!opt1 || !opt2 || !opt3 || !opt4) {
            alert('All options are required');
            return null;
        }
        
        question.options = [opt1, opt2, opt3, opt4];
        question.correctAnswer = parseInt(document.getElementById('correctOpt').value);
    } else if (type === 'true_false') {
        question.correctAnswer = document.getElementById('correctOpt').value === 'true';
    } else if (type === 'fill_blank') {
        const correct = document.getElementById('correctAnswer')?.value.trim();
        if (!correct) {
            alert('Correct answer is required');
            return null;
        }
        question.correctAnswer = correct;
    } else if (type === 'numeric') {
        const correct = parseFloat(document.getElementById('correctValue')?.value);
        if (isNaN(correct)) {
            alert('Correct answer is required');
            return null;
        }
        question.correctAnswer = correct;
        question.unit = document.getElementById('unit')?.value || '';
        question.tolerance = 0;
    }
    
    return question;
}

function renderQuestionForm() {
    const type = document.getElementById('questionType').value;
    const container = document.getElementById('questionFormContainer');
    
    let html = '<input type="text" id="questionText" class="input-field mb-20" placeholder="Enter your question...">';
    
    if (type === 'multiple_choice') {
        html += `
            <input type="text" id="opt1" class="input-field mb-20" placeholder="Option A">
            <input type="text" id="opt2" class="input-field mb-20" placeholder="Option B">
            <input type="text" id="opt3" class="input-field mb-20" placeholder="Option C">
            <input type="text" id="opt4" class="input-field mb-20" placeholder="Option D">
            <select id="correctOpt" class="input-field mb-20">
                <option value="0">Option A is correct</option>
                <option value="1">Option B is correct</option>
                <option value="2">Option C is correct</option>
                <option value="3">Option D is correct</option>
            </select>
        `;
    } else if (type === 'true_false') {
        html += `
            <select id="correctOpt" class="input-field mb-20">
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        `;
    } else if (type === 'fill_blank') {
        html += `<input type="text" id="correctAnswer" class="input-field mb-20" placeholder="Correct answer">`;
    } else if (type === 'numeric') {
        html += `
            <input type="number" id="correctValue" class="input-field mb-20" placeholder="Correct answer">
            <input type="text" id="unit" class="input-field mb-20" placeholder="Unit (optional)">
        `;
    }
    
    html += `
        <input type="text" id="explanation" class="input-field mb-20" placeholder="Explanation (optional)">
        <input type="number" id="points" class="input-field" placeholder="Points" value="100">
    `;
    
    container.innerHTML = html;
}