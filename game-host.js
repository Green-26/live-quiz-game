// ==================== HOST FUNCTIONS ====================
let currentQuestionTimeout = null;

function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hostNewGame() {
    setLoading('Creating game');
    try {
        const pin = generatePin();
        const userCredential = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);
        
        await gameRef.set({
            pin: pin,
            status: 'lobby',
            currentQuestionIndex: -1,
            questions: [],
            hostId: userCredential.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentUser = { uid: userCredential.user.uid, isHost: true, gameId: pin };
        currentGameRef = gameRef;
        sessionStorage.setItem('quizUser', JSON.stringify(currentUser));
        switchToHost(pin);
        attachHostListeners(gameRef);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('authError').innerText = 'Failed to create game';
    }
}

async function attachHostListeners(gameRef) {
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        document.getElementById('hostPin').innerText = data.pin;
        currentQuestions = data.questions;
        renderQuestionsList(data.questions);
        
        const startBtn = document.getElementById('startGameBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        
        if (data.status === 'active') {
            const total = data.questions.length;
            const curr = data.currentQuestionIndex;
            startBtn.disabled = true;
            document.getElementById('endGameBtn').classList.remove('hidden');
            
            if (curr + 1 < total) {
                nextBtn.disabled = false;
            } else {
                nextBtn.disabled = true;
            }
            
            if (curr >= 0 && curr < total) {
                document.getElementById('hostGameStatus').innerHTML = `📢 Question ${curr + 1}/${total} is LIVE!`;
            } else {
                document.getElementById('hostGameStatus').innerHTML = '🚀 Press Next Question to begin';
            }
        } else if (data.status === 'lobby') {
            startBtn.disabled = false;
            nextBtn.disabled = true;
            document.getElementById('endGameBtn').classList.add('hidden');
            document.getElementById('hostGameStatus').innerHTML = '📌 Add questions and press Start Game!';
        } else if (data.status === 'ended') {
            nextBtn.disabled = true;
            startBtn.disabled = true;
            document.getElementById('hostGameStatus').innerHTML = '🏁 Game Over!';
        }
    });
    
    const playersRef = gameRef.collection('players');
    unsubPlayers = playersRef.onSnapshot(snapshot => {
        const players = [];
        snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
        players.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        const leaderboardDiv = document.getElementById('hostLeaderboard');
        if (players.length === 0) {
            leaderboardDiv.innerHTML = '<div class="leaderboard-entry">Waiting for players...</div>';
        } else {
            leaderboardDiv.innerHTML = players.map((p, idx) => `
                <div class="leaderboard-entry ${idx === 0 ? 'top-1' : ''}">
                    <span>${idx === 0 ? '👑' : `${idx + 1}.`} ${escapeHtml(p.name)}</span>
                    <span>⭐ ${p.score || 0} pts</span>
                </div>
            `).join('');
        }
    });
}

function renderQuestionsList(questions) {
    const container = document.getElementById('questionsList');
    if (!questions || questions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#718096;">No questions yet. Add some above!</p>';
        return;
    }
    
    container.innerHTML = questions.map((q, idx) => {
        let typeClass = 'mc';
        if (q.type === 'true_false') typeClass = 'tf';
        else if (q.type === 'fill_blank') typeClass = 'fb';
        else if (q.type === 'numeric') typeClass = 'numeric';
        
        return `
            <div class="question-item">
                <div>
                    <span class="question-type-badge type-${typeClass}">${q.type.replace('_', ' ')}</span>
                    <strong>Q${idx + 1}:</strong> ${escapeHtml(q.text.substring(0, 50))}
                    <span style="margin-left: 10px;">🎯 ${q.points} pts</span>
                </div>
                <button class="remove-question-btn" data-index="${idx}">✖</button>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.remove-question-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(btn.dataset.index);
            if (confirm('Remove this question?')) {
                const questions = currentQuestions;
                questions.splice(index, 1);
                await currentGameRef.update({ questions: questions });
            }
        });
    });
}

async function addQuestion() {
    if (!currentUser?.isHost) {
        alert('You must be a host');
        return;
    }
    
    setLoading('Adding question');
    const question = buildQuestionFromForm();
    if (!question) return;
    
    try {
        const questions = [...currentQuestions, question];
        await currentGameRef.update({ questions: questions });
        
        document.getElementById('qText').value = '';
        if (document.getElementById('opt1')) document.getElementById('opt1').value = '';
        if (document.getElementById('opt2')) document.getElementById('opt2').value = '';
        if (document.getElementById('opt3')) document.getElementById('opt3').value = '';
        if (document.getElementById('opt4')) document.getElementById('opt4').value = '';
        
        alert('Question added!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add question');
    }
}

async function addSampleQuestions() {
    if (!currentUser?.isHost) {
        alert('You must be a host');
        return;
    }
    
    setLoading('Adding samples');
    
    const samples = [
        {
            id: Date.now() + 1,
            type: 'multiple_choice',
            text: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correctAnswer: 1,
            difficulty: 'easy',
            subject: 'geography',
            points: 100,
            explanation: 'Paris is the capital of France'
        },
        {
            id: Date.now() + 2,
            type: 'true_false',
            text: 'The Earth is flat',
            correctAnswer: false,
            difficulty: 'easy',
            subject: 'science',
            points: 50,
            explanation: 'The Earth is actually round'
        },
        {
            id: Date.now() + 3,
            type: 'numeric',
            text: 'What is 15 + 27?',
            correctAnswer: 42,
            tolerance: 0,
            unit: '',
            difficulty: 'easy',
            subject: 'math',
            points: 75,
            explanation: '15 + 27 = 42'
        }
    ];
    
    try {
        const questions = [...currentQuestions, ...samples];
        await currentGameRef.update({ questions: questions });
        alert(`Added ${samples.length} sample questions!`);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add samples');
    }
}

async function clearAllQuestions() {
    if (!confirm('⚠️ Clear ALL questions? This cannot be undone!')) return;
    setLoading('Clearing questions');
    try {
        await currentGameRef.update({ questions: [] });
        alert('All questions cleared!');
    } catch (error) {
        alert('Failed to clear');
    }
}

async function previewQuestions() {
    if (!currentQuestions || currentQuestions.length === 0) {
        alert('No questions to preview');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    
    content.innerHTML = currentQuestions.map((q, idx) => `
        <div class="preview-question">
            <h4>Question ${idx + 1}</h4>
            <p><strong>${escapeHtml(q.text)}</strong></p>
            <p><strong>Type:</strong> ${q.type.replace('_', ' ')}</p>
            <p><strong>Difficulty:</strong> ${q.difficulty}</p>
            <p><strong>Points:</strong> ${q.points}</p>
            <p class="correct"><strong>Answer:</strong> ${getCorrectAnswerDisplay(q)}</p>
            ${q.explanation ? `<p><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>` : ''}
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
}

async function startGame() {
    setLoading('Starting game');
    try {
        if (!currentQuestions || currentQuestions.length === 0) {
            alert('Please add questions first!');
            return;
        }
        
        await currentGameRef.update({ status: 'active', currentQuestionIndex: -1 });
        document.getElementById('hostGameStatus').innerHTML = '🚀 Game started! Press Next Question.';
        document.getElementById('nextQuestionBtn').disabled = false;
    } catch (error) {
        alert('Failed to start game');
    }
}

async function nextQuestion() {
    setLoading('Loading question');
    try {
        const snap = await currentGameRef.get();
        const data = snap.data();
        
        if (data.status !== 'active') {
            alert('Game not active');
            return;
        }
        
        let nextIdx = (data.currentQuestionIndex || -1) + 1;
        
        if (nextIdx >= data.questions.length) {
            await currentGameRef.update({ status: 'ended' });
            document.getElementById('hostGameStatus').innerHTML = '🏁 Game Over!';
            document.getElementById('nextQuestionBtn').disabled = true;
            alert('Quiz completed!');
            return;
        }
        
        if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
        
        await currentGameRef.update({ currentQuestionIndex: nextIdx });
        
        const activeQRef = currentGameRef.collection('activeQuestion').doc('current');
        await activeQRef.set({
            question: data.questions[nextIdx],
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
            isActive: true,
            questionIndex: nextIdx
        });
        
        document.getElementById('nextQuestionBtn').disabled = true;
        document.getElementById('hostGameStatus').innerHTML = `📢 Question ${nextIdx + 1}/${data.questions.length} is LIVE!`;
        
        currentQuestionTimeout = setTimeout(async () => {
            const active = await currentGameRef.collection('activeQuestion').doc('current').get();
            if (active.exists && active.data()?.isActive) {
                await activeQRef.update({ isActive: false });
                document.getElementById('hostGameStatus').innerHTML = `⏰ Time\'s up for Question ${nextIdx + 1}!`;
                document.getElementById('nextQuestionBtn').disabled = false;
            }
        }, 15000);
        
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load next question');
    }
}

async function endGame() {
    if (confirm('End the game?')) {
        setLoading('Ending game');
        if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
        await currentGameRef.update({ status: 'ended' });
        document.getElementById('nextQuestionBtn').disabled = true;
    }
}

function closeModal() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.classList.add('hidden');
}