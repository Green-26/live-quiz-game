// ==================== HOST FUNCTIONS ====================
let currentQuestionTimeout = null;

function setLoading(title) {
    document.title = `🔄 ${title}... | SmartQuiz Live`;
    setTimeout(() => {
        if (!document.title.includes('Loading')) {
            document.title = '🎯 SmartQuiz Live | Multi-Question Type Game';
        }
    }, 1000);
}

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
        console.error('Error creating game:', error);
        document.getElementById('authError').innerText = 'Failed to create game. Please try again.';
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
            
            if (curr + 1 < total && !data.waitingForNext) {
                nextBtn.disabled = false;
            } else {
                nextBtn.disabled = true;
            }
            startBtn.disabled = true;
            document.getElementById('endGameBtn').classList.remove('hidden');
            
            if (curr >= 0 && curr < total) {
                document.getElementById('hostGameStatus').innerHTML = `📢 Question ${curr + 1}/${total} is LIVE!`;
            } else {
                document.getElementById('hostGameStatus').innerHTML = '🚀 Game started! Press "Next Question" to begin.';
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
            leaderboardDiv.innerHTML = '<div class="leaderboard-entry">Waiting for players to join...</div>';
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
    const questionsDiv = document.getElementById('questionsList');
    if (!questions || questions.length === 0) {
        questionsDiv.innerHTML = '<p style="color: #718096; text-align: center;">No questions added yet. Build your quiz above!</p>';
        return;
    }
    
    questionsDiv.innerHTML = questions.map((q, idx) => {
        let typeClass = 'mc';
        if (q.type === 'true_false') typeClass = 'tf';
        else if (q.type === 'fill_blank') typeClass = 'fb';
        else if (q.type === 'matching') typeClass = 'match';
        else if (q.type === 'ordering') typeClass = 'order';
        else if (q.type === 'numeric') typeClass = 'numeric';
        
        return `
            <div style="background: #f7fafc; padding: 10px; margin: 8px 0; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <span class="question-type-badge type-${typeClass}">${q.type.replace('_', ' ')}</span>
                    <strong>Q${idx + 1}:</strong> ${escapeHtml(q.text.substring(0, 60))}${q.text.length > 60 ? '...' : ''}
                    <span style="margin-left: 10px;">🎯 ${q.points} pts | 📚 ${q.subject}</span>
                </div>
                <button class="btn-remove-question btn-danger" data-index="${idx}" style="padding: 5px 10px; font-size: 0.8rem;">❌</button>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.btn-remove-question').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const index = parseInt(btn.dataset.index);
            await removeQuestion(index);
        });
    });
}

async function removeQuestion(index) {
    if (!confirm('Remove this question?')) return;
    setLoading('Removing question');
    try {
        const gameDoc = await currentGameRef.get();
        const questions = gameDoc.data()?.questions || [];
        questions.splice(index, 1);
        await currentGameRef.update({ questions: questions });
    } catch (error) {
        console.error('Error removing question:', error);
        alert('Failed to remove question');
    }
}

async function addQuestion() {
    if (!currentUser?.isHost) {
        alert('You must be a host to add questions');
        return;
    }
    
    setLoading('Adding question');
    const question = buildQuestionFromForm();
    if (!question) return;
    
    try {
        const gameDoc = await currentGameRef.get();
        const questions = gameDoc.data()?.questions || [];
        
        await currentGameRef.update({
            questions: [...questions, question]
        });
        
        document.getElementById('qText').value = '';
        if (document.getElementById('opt1')) document.getElementById('opt1').value = '';
        if (document.getElementById('opt2')) document.getElementById('opt2').value = '';
        if (document.getElementById('opt3')) document.getElementById('opt3').value = '';
        if (document.getElementById('opt4')) document.getElementById('opt4').value = '';
        
        alert('Question added successfully!');
    } catch (error) {
        console.error('Error adding question:', error);
        alert('Failed to add question. Please try again.');
    }
}

async function clearAllQuestions() {
    if (!confirm('⚠️ Clear ALL questions? This cannot be undone!')) return;
    setLoading('Clearing questions');
    try {
        await currentGameRef.update({ questions: [] });
        alert('All questions cleared!');
    } catch (error) {
        console.error('Error clearing questions:', error);
        alert('Failed to clear questions');
    }
}

async function previewQuestions() {
    const gameDoc = await currentGameRef.get();
    const questions = gameDoc.data()?.questions || [];
    
    if (questions.length === 0) {
        alert('No questions to preview. Add some questions first!');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    
    previewContent.innerHTML = questions.map((q, idx) => `
        <div class="preview-question">
            <h4>Question ${idx + 1}</h4>
            <p><strong>${escapeHtml(q.text)}</strong></p>
            <p><strong>Type:</strong> ${q.type.replace('_', ' ')}</p>
            <p><strong>Difficulty:</strong> ${q.difficulty}</p>
            <p><strong>Points:</strong> ${q.points}</p>
            <div class="correct-answer">
                <strong>Correct Answer:</strong> ${getPreviewAnswer(q)}
            </div>
            ${q.explanation ? `<p><strong>Explanation:</strong> ${escapeHtml(q.explanation)}</p>` : ''}
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
}

function getPreviewAnswer(question) {
    switch(question.type) {
        case 'multiple_choice':
            return question.options[question.correctAnswer];
        case 'true_false':
            return question.correctAnswer ? 'True' : 'False';
        case 'fill_blank':
            return question.correctAnswer;
        case 'numeric':
            return `${question.correctAnswer} ${question.unit || ''}`;
        case 'matching':
            return question.leftItems.map((l, i) => `${l} → ${question.rightItems[i]}`).join(', ');
        case 'ordering':
            return question.items.join(' → ');
        default:
            return 'Check question configuration';
    }
}

async function startGame() {
    setLoading('Starting game');
    try {
        const snap = await currentGameRef.get();
        const questions = snap.data()?.questions;
        
        if (!questions || questions.length === 0) {
            alert('Please add at least one question first!');
            return;
        }
        
        await currentGameRef.update({ status: 'active', currentQuestionIndex: -1, waitingForNext: true });
        document.getElementById('hostGameStatus').innerHTML = '🚀 Game started! Press "Next Question" to begin.';
        document.getElementById('nextQuestionBtn').disabled = false;
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Failed to start game. Please try again.');
    }
}

async function nextQuestion() {
    setLoading('Loading next question');
    try {
        const snap = await currentGameRef.get();
        const data = snap.data();
        
        if (data.status !== 'active') {
            alert('Game is not active. Please start the game first.');
            return;
        }
        
        let nextIdx = (data.currentQuestionIndex || -1) + 1;
        const questions = data.questions;
        
        if (nextIdx >= questions.length) {
            await currentGameRef.update({ status: 'ended' });
            document.getElementById('hostGameStatus').innerHTML = '🏁 Game Over! Great job everyone!';
            document.getElementById('nextQuestionBtn').disabled = true;
            alert('Quiz completed! Game has ended.');
            return;
        }
        
        if (currentQuestionTimeout) {
            clearTimeout(currentQuestionTimeout);
        }
        
        await currentGameRef.update({ currentQuestionIndex: nextIdx, waitingForNext: false });
        
        const activeQRef = currentGameRef.collection('activeQuestion').doc('current');
        await activeQRef.set({
            question: questions[nextIdx],
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
            isActive: true,
            questionIndex: nextIdx
        });
        
        document.getElementById('nextQuestionBtn').disabled = true;
        document.getElementById('hostGameStatus').innerHTML = `📢 Question ${nextIdx + 1}/${questions.length} is LIVE!`;
        
        currentQuestionTimeout = setTimeout(async () => {
            const activeDoc = await currentGameRef.collection('activeQuestion').doc('current').get();
            if (activeDoc.exists && activeDoc.data()?.isActive) {
                await currentGameRef.collection('activeQuestion').doc('current').update({ isActive: false });
                document.getElementById('hostGameStatus').innerHTML = `⏰ Time\'s up for Question ${nextIdx + 1}! Click Next to continue.`;
                document.getElementById('nextQuestionBtn').disabled = false;
            }
        }, 15000);
        
    } catch (error) {
        console.error('Error loading next question:', error);
        alert('Failed to load next question. Please try again.');
    }
}

async function endGame() {
    if (confirm('Are you sure you want to end the game?')) {
        setLoading('Ending game');
        if (currentQuestionTimeout) {
            clearTimeout(currentQuestionTimeout);
        }
        await currentGameRef.update({ status: 'ended' });
        document.getElementById('hostGameStatus').innerHTML = '🏁 Game ended by host.';
        document.getElementById('nextQuestionBtn').disabled = true;
    }
}

// Modal close functions
function closeModal() {
    const modal = document.getElementById('previewModal');
    modal.classList.add('hidden');
}

// Clear all questions button
document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('clearAllQuestionsBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearAllQuestions);
    
    const previewBtn = document.getElementById('previewQuestionsBtn');
    if (previewBtn) previewBtn.addEventListener('click', previewQuestions);
    
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeModalFooterBtn = document.getElementById('closeModalFooterBtn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeModalFooterBtn) closeModalFooterBtn.addEventListener('click', closeModal);
});