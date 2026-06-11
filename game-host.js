// ==================== HOST FUNCTIONS ====================
let questionTimeout = null;

async function hostNewGame() {
    setLoading('Creating game');
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
        const user = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);
        
        await gameRef.set({
            pin: pin,
            status: 'lobby',
            currentQuestionIndex: -1,
            questions: [],
            hostId: user.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentUser = { uid: user.user.uid, isHost: true, gameId: pin };
        currentGameRef = gameRef;
        sessionStorage.setItem('quizUser', JSON.stringify(currentUser));
        
        switchToHost(pin);
        attachHostListeners(gameRef);
        
    } catch (error) {
        console.error(error);
        document.getElementById('authError').innerText = 'Failed to create game: ' + error.message;
    }
}

async function attachHostListeners(gameRef) {
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        
        document.getElementById('hostPin').innerText = data.pin;
        currentQuestions = data.questions || [];
        
        renderQuestionsList(currentQuestions);
        
        const startBtn = document.getElementById('startGameBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const endBtn = document.getElementById('endGameBtn');
        const statusDiv = document.getElementById('gameStatusMessage');
        
        if (data.status === 'active') {
            startBtn.disabled = true;
            endBtn.classList.remove('hidden');
            
            const total = data.questions.length;
            const current = data.currentQuestionIndex;
            
            if (current + 1 < total) {
                nextBtn.disabled = false;
            } else {
                nextBtn.disabled = true;
            }
            
            if (current >= 0) {
                statusDiv.innerHTML = `📢 Question ${current + 1}/${total} is LIVE!`;
            } else {
                statusDiv.innerHTML = '🚀 Press Next Question to start';
            }
        } else if (data.status === 'lobby') {
            startBtn.disabled = false;
            nextBtn.disabled = true;
            endBtn.classList.add('hidden');
            statusDiv.innerHTML = '📌 Add questions and press Start Game';
        } else if (data.status === 'ended') {
            nextBtn.disabled = true;
            startBtn.disabled = true;
            statusDiv.innerHTML = '🏁 Game Over!';
        }
    });
    
    const playersRef = gameRef.collection('players');
    unsubPlayers = playersRef.onSnapshot(snapshot => {
        const players = [];
        snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
        players.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        const container = document.getElementById('leaderboardList');
        if (players.length === 0) {
            container.innerHTML = '<div class="leaderboard-entry">Waiting for players...</div>';
        } else {
            container.innerHTML = players.map((p, i) => `
                <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                    <span>${i === 0 ? '👑' : `${i+1}.`} ${escapeHtml(p.name)}</span>
                    <span>⭐ ${p.score || 0}</span>
                </div>
            `).join('');
        }
    });
}

function renderQuestionsList(questions) {
    const container = document.getElementById('questionsListContainer');
    
    if (!questions || questions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#718096; padding:20px;">No questions yet. Add some above!</p>';
        return;
    }
    
    container.innerHTML = questions.map((q, i) => `
        <div class="question-item">
            <div>
                <span class="question-badge">${q.type.replace('_', ' ')}</span>
                <strong>Q${i+1}:</strong> ${escapeHtml(q.text.substring(0, 50))}
                <span style="margin-left:10px;">🎯 ${q.points} pts</span>
            </div>
            <button class="remove-btn" data-index="${i}">✖ Remove</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const index = parseInt(btn.dataset.index);
            if (confirm('Remove this question?')) {
                const newQuestions = [...currentQuestions];
                newQuestions.splice(index, 1);
                await currentGameRef.update({ questions: newQuestions });
            }
        });
    });
}

async function addQuestion() {
    if (!currentUser?.isHost) {
        alert('You must be a host');
        return;
    }
    
    const question = buildQuestion();
    if (!question) return;
    
    setLoading('Adding question');
    
    try {
        const newQuestions = [...currentQuestions, question];
        await currentGameRef.update({ questions: newQuestions });
        
        document.getElementById('questionText').value = '';
        if (document.getElementById('opt1')) document.getElementById('opt1').value = '';
        if (document.getElementById('opt2')) document.getElementById('opt2').value = '';
        if (document.getElementById('opt3')) document.getElementById('opt3').value = '';
        if (document.getElementById('opt4')) document.getElementById('opt4').value = '';
        
        alert('Question added!');
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function addSampleQuestions() {
    if (!currentUser?.isHost) return;
    
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
            points: 75
        },
        {
            id: Date.now() + 4,
            type: 'fill_blank',
            text: 'Water freezes at ______ degrees Celsius',
            correctAnswer: '0',
            difficulty: 'easy',
            subject: 'science',
            points: 50
        }
    ];
    
    try {
        const newQuestions = [...currentQuestions, ...samples];
        await currentGameRef.update({ questions: newQuestions });
        alert(`Added ${samples.length} sample questions!`);
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function clearAllQuestions() {
    if (!confirm('⚠️ Clear ALL questions?')) return;
    try {
        await currentGameRef.update({ questions: [] });
        alert('All questions cleared');
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function previewQuestions() {
    if (!currentQuestions.length) {
        alert('No questions to preview');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    
    content.innerHTML = currentQuestions.map((q, i) => `
        <div class="preview-question">
            <h4>Question ${i+1}</h4>
            <p><strong>${escapeHtml(q.text)}</strong></p>
            <p>Type: ${q.type.replace('_', ' ')} | Difficulty: ${q.difficulty} | Points: ${q.points}</p>
            <p style="color:#48bb78;"><strong>✓ Answer:</strong> ${getCorrectAnswerText(q)}</p>
            ${q.explanation ? `<p>📖 ${escapeHtml(q.explanation)}</p>` : ''}
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
}

async function startGame() {
    if (!currentQuestions.length) {
        alert('Add questions first!');
        return;
    }
    
    setLoading('Starting game');
    try {
        await currentGameRef.update({ status: 'active', currentQuestionIndex: -1 });
        document.getElementById('nextQuestionBtn').disabled = false;
        document.getElementById('gameStatusMessage').innerHTML = '🚀 Game started! Press Next Question';
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function nextQuestion() {
    setLoading('Loading question');
    
    try {
        const doc = await currentGameRef.get();
        const data = doc.data();
        
        if (data.status !== 'active') {
            alert('Game not active');
            return;
        }
        
        let nextIdx = (data.currentQuestionIndex || -1) + 1;
        
        if (nextIdx >= data.questions.length) {
            await currentGameRef.update({ status: 'ended' });
            document.getElementById('nextQuestionBtn').disabled = true;
            alert('Quiz completed!');
            return;
        }
        
        if (questionTimeout) clearTimeout(questionTimeout);
        
        await currentGameRef.update({ currentQuestionIndex: nextIdx });
        
        const activeRef = currentGameRef.collection('activeQuestion').doc('current');
        await activeRef.set({
            question: data.questions[nextIdx],
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
            isActive: true,
            questionIndex: nextIdx
        });
        
        document.getElementById('nextQuestionBtn').disabled = true;
        document.getElementById('gameStatusMessage').innerHTML = `📢 Question ${nextIdx + 1}/${data.questions.length} is LIVE!`;
        
        questionTimeout = setTimeout(async () => {
            const active = await currentGameRef.collection('activeQuestion').doc('current').get();
            if (active.exists && active.data()?.isActive) {
                await activeRef.update({ isActive: false });
                document.getElementById('gameStatusMessage').innerHTML = `⏰ Time\'s up for Question ${nextIdx + 1}!`;
                document.getElementById('nextQuestionBtn').disabled = false;
            }
        }, 15000);
        
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function endGame() {
    if (confirm('End the game?')) {
        if (questionTimeout) clearTimeout(questionTimeout);
        await currentGameRef.update({ status: 'ended' });
        document.getElementById('nextQuestionBtn').disabled = true;
    }
}

function closeModal() {
    document.getElementById('previewModal').classList.add('hidden');
}