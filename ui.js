// ==================== UI NAVIGATION ====================

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

function showDirectHostPanel() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('teacherDashboard').classList.add('hidden');
    document.getElementById('directHostPanel').classList.remove('hidden');
    document.getElementById('activeGameDashboard').classList.add('hidden');
    document.getElementById('studentJoinPage').classList.add('hidden');
    
    // Load saved questions or start fresh
    if (directHostQuestions.length === 0) {
        const saved = localStorage.getItem('directHostQuestions');
        if (saved) {
            directHostQuestions = JSON.parse(saved);
        }
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
    clearSession();
    showLandingPage();
}

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
    saveDirectQuestionsToLocal();
    
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
                saveDirectQuestionsToLocal();
            }
        });
    });
}

function saveDirectQuestionsToLocal() {
    localStorage.setItem('directHostQuestions', JSON.stringify(directHostQuestions));
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
    saveDirectQuestionsToLocal();
    alert(`Added ${samples.length} sample questions!`);
}

function clearDirectQuestions() {
    if (confirm('⚠️ Clear ALL questions?')) {
        directHostQuestions = [];
        renderDirectQuestionsList();
        saveDirectQuestionsToLocal();
        alert('All questions cleared');
    }
}

async function finalizeAndHostGame() {
    if (!directHostQuestions.length) {
        alert('Please add some questions first!');
        return;
    }
    
    setLoading('Creating game');
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentGamePin = pin;
    currentQuestions = directHostQuestions;
    
    try {
        const user = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);
        
        await gameRef.set({
            pin: pin,
            status: 'created',
            currentQuestionIndex: -1,
            questions: directHostQuestions,
            hostId: user.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentGameRef = gameRef;
        saveSession(pin, true);
        
        // Switch to active game dashboard
        document.getElementById('directHostPanel').classList.add('hidden');
        document.getElementById('activeGameDashboard').classList.remove('hidden');
        document.getElementById('gamePinDisplay').innerText = pin;
        document.getElementById('gameStatusMessage').innerHTML = '📌 Game created! Share this PIN with students. Click START GAME when ready.';
        
        attachGameListeners(gameRef);
        
        console.log('Game created with PIN:', pin);
    } catch (error) {
        console.error(error);
        alert('Failed to create game: ' + error.message);
    }
}

// Setup all UI event listeners
function setupUIListeners() {
    // Main navigation
    document.getElementById('teacherDashboardBtn')?.addEventListener('click', () => {
        loadQuestionsFromLocal();
        showTeacherDashboard();
    });
    
    document.getElementById('hostNewGameBtn')?.addEventListener('click', () => {
        directHostQuestions = [];
        const saved = localStorage.getItem('directHostQuestions');
        if (saved) directHostQuestions = JSON.parse(saved);
        renderDirectQuestionsList();
        showDirectHostPanel();
    });
    
    document.getElementById('studentJoinBtn')?.addEventListener('click', showStudentJoin);
    document.getElementById('backToLandingBtn')?.addEventListener('click', backToLanding);
    document.getElementById('backFromDirectHostBtn')?.addEventListener('click', backToLanding);
    document.getElementById('backToLandingFromStudentBtn')?.addEventListener('click', backToLanding);
    document.getElementById('exitGameBtn')?.addEventListener('click', backToLanding);
    
    // Question builder for teacher dashboard
    document.getElementById('addQuestionBtn')?.addEventListener('click', addQuestion);
    document.getElementById('addSampleBtn')?.addEventListener('click', addSampleQuestions);
    document.getElementById('clearQuestionsBtn')?.addEventListener('click', clearAllQuestions);
    document.getElementById('questionType')?.addEventListener('change', renderQuestionForm);
    document.getElementById('createGameAndHostBtn')?.addEventListener('click', createGameAndHost);
    
    // Direct host panel buttons
    document.getElementById('directAddQuestionBtn')?.addEventListener('click', addDirectQuestion);
    document.getElementById('directAddSampleBtn')?.addEventListener('click', addDirectSampleQuestions);
    document.getElementById('directClearQuestionsBtn')?.addEventListener('click', clearDirectQuestions);
    document.getElementById('directQuestionType')?.addEventListener('change', renderDirectQuestionForm);
    document.getElementById('finalizeHostGameBtn')?.addEventListener('click', finalizeAndHostGame);
    
    // Game control buttons
    document.getElementById('startGameBtn')?.addEventListener('click', startGame);
    document.getElementById('nextQuestionBtn')?.addEventListener('click', nextQuestion);
    document.getElementById('endGameBtn')?.addEventListener('click', endGame);
    document.getElementById('previewGameBtn')?.addEventListener('click', () => {
        if (currentQuestions.length) {
            const modal = document.getElementById('previewModal');
            const content = document.getElementById('previewContent');
            content.innerHTML = currentQuestions.map((q, i) => `
                <div class="preview-question">
                    <h4>Question ${i+1}</h4>
                    <p><strong>${escapeHtml(q.text)}</strong></p>
                    <p>Type: ${q.type} | Difficulty: ${q.difficulty} | Points: ${q.points}</p>
                    <p style="color:#48bb78;"><strong>Answer:</strong> ${getCorrectAnswerText(q)}</p>
                </div>
            `).join('');
            modal.classList.remove('hidden');
        } else {
            alert('No questions to preview');
        }
    });
    
    // Student join
    document.getElementById('joinGameBtn')?.addEventListener('click', joinGameAsStudent);
    
    // Modal close
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('previewModal').classList.add('hidden');
    });
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        document.getElementById('previewModal').classList.add('hidden');
    });
    
    // Enter key for join
    document.getElementById('gamePinInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGameAsStudent();
    });
    document.getElementById('studentNameInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGameAsStudent();
    });
    
    // Initialize form
    renderQuestionForm();
    renderDirectQuestionForm();
}