// ==================== PLAYER FUNCTIONS ====================
let hasAnswered = false;

async function joinGame() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const gamePin = document.getElementById('gamePinInput').value.trim();
    
    if (!playerName || !gamePin) {
        document.getElementById('authError').innerText = 'Enter name and PIN';
        return;
    }
    
    setLoading('Joining game');
    
    try {
        const gameRef = db.collection('games').doc(gamePin);
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists) {
            document.getElementById('authError').innerText = 'Game not found!';
            return;
        }
        
        const userCredential = await auth.signInAnonymously();
        const playerId = userCredential.user.uid;
        
        await gameRef.collection('players').doc(playerId).set({
            name: playerName,
            score: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentUser = { uid: playerId, isHost: false, gameId: gamePin, playerName: playerName };
        sessionStorage.setItem('quizUser', JSON.stringify(currentUser));
        switchToPlayer(gamePin, playerName);
        attachPlayerListeners(gameRef, playerId);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('authError').innerText = 'Failed to join';
    }
}

async function attachPlayerListeners(gameRef, playerId) {
    if (unsubGame) unsubGame();
    if (activeQuestionListener) activeQuestionListener();
    
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        
        if (data.status === 'lobby') {
            document.getElementById('waitingArea').classList.remove('hidden');
            document.getElementById('quizArea').classList.add('hidden');
        } else if (data.status === 'active') {
            document.getElementById('waitingArea').classList.add('hidden');
            document.getElementById('quizArea').classList.remove('hidden');
        } else if (data.status === 'ended') {
            document.getElementById('quizArea').classList.add('hidden');
            showGameResults(gameRef, playerId);
        }
    });
    
    const activeQRef = gameRef.collection('activeQuestion').doc('current');
    activeQuestionListener = activeQRef.onSnapshot(async (snap) => {
        if (!snap.exists || !snap.data().isActive) {
            document.getElementById('questionDisplay').innerHTML = '<div class="text-center">⏳ Getting next question...</div>';
            return;
        }
        
        hasAnswered = false;
        const qData = snap.data();
        const question = qData.question;
        const expiresAt = qData.expiresAt.toDate();
        
        renderPlayerQuestion(question);
        startPlayerTimer(expiresAt);
        
        const submitHandler = async (answer) => {
            if (hasAnswered) return;
            hasAnswered = true;
            await submitAnswer(gameRef, playerId, answer, question, qData.questionIndex, expiresAt);
        };
        
        attachAnswerListeners(question, submitHandler);
    });
    
    const playerScoreRef = gameRef.collection('players').doc(playerId);
    if (unsubPlayers) unsubPlayers();
    unsubPlayers = playerScoreRef.onSnapshot(doc => {
        if (doc.exists) {
            document.getElementById('playerScore').innerText = doc.data()?.score || 0;
        }
    });
}

function renderPlayerQuestion(question) {
    const renderer = QuestionRenderers[question.type];
    if (renderer) {
        document.getElementById('questionDisplay').innerHTML = renderer(question);
    }
}

function attachAnswerListeners(question, callback) {
    if (question.type === 'multiple_choice') {
        document.querySelectorAll('.option').forEach(opt => {
            opt.onclick = () => callback(parseInt(opt.dataset.value));
        });
    } else if (question.type === 'true_false') {
        document.querySelectorAll('.tf-option').forEach(opt => {
            opt.onclick = () => callback(opt.dataset.value === 'true');
        });
    } else if (question.type === 'fill_blank' || question.type === 'numeric') {
        const btn = document.getElementById('submitAnswerBtn');
        if (btn) {
            btn.onclick = () => {
                const input = document.getElementById(question.type === 'fill_blank' ? 'blankAnswer' : 'numericAnswer');
                const value = question.type === 'numeric' ? parseFloat(input.value) : input.value;
                if (value || value === 0) callback(value);
                else alert('Please enter an answer');
            };
        }
    }
}

async function submitAnswer(gameRef, playerId, answer, question, qIndex, expiresAt) {
    try {
        const existing = await gameRef.collection('players').doc(playerId).collection('answers').doc(`q${qIndex}`).get();
        if (existing.exists) {
            document.getElementById('answerFeedback').innerHTML = '<p style="color:#ed8936;">Already answered!</p>';
            return;
        }
        
        const isCorrect = validateAnswer(question, answer);
        const timeLeft = Math.max(0, (expiresAt.getTime() - Date.now()) / 1000);
        const points = calculatePoints(question, timeLeft, isCorrect);
        
        const feedback = document.getElementById('answerFeedback');
        if (isCorrect) {
            feedback.innerHTML = `<div style="background:#c6f6d5; padding:15px; border-radius:12px;">✅ CORRECT! +${points} points!</div>`;
        } else {
            feedback.innerHTML = `<div style="background:#fed7d7; padding:15px; border-radius:12px;">❌ Wrong! Answer: ${getCorrectAnswerDisplay(question)}</div>`;
        }
        
        await gameRef.collection('players').doc(playerId).collection('answers').doc(`q${qIndex}`).set({
            answer: answer,
            correct: isCorrect,
            points: points,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const playerDoc = await gameRef.collection('players').doc(playerId).get();
        const newScore = (playerDoc.data()?.score || 0) + points;
        await gameRef.collection('players').doc(playerId).update({ score: newScore });
        
        document.querySelectorAll('.option, .tf-option, button').forEach(el => {
            if (el.tagName === 'BUTTON') el.disabled = true;
            else el.style.pointerEvents = 'none';
        });
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('answerFeedback').innerHTML = '<p style="color:#f56565;">Failed to submit</p>';
        hasAnswered = false;
    }
}

function startPlayerTimer(expiresAt) {
    if (window.timerInterval) clearInterval(window.timerInterval);
    
    window.timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        const timerDiv = document.getElementById('timerDisplay');
        timerDiv.innerText = remaining;
        if (remaining <= 5) timerDiv.classList.add('timer-warning');
        else timerDiv.classList.remove('timer-warning');
        if (remaining <= 0) clearInterval(window.timerInterval);
    }, 200);
}

async function showGameResults(gameRef, playerId) {
    const playersSnapshot = await gameRef.collection('players').orderBy('score', 'desc').get();
    const players = [];
    let playerRank = 0;
    let playerScore = 0;
    
    playersSnapshot.forEach((doc, idx) => {
        const data = doc.data();
        players.push({ name: data.name, score: data.score || 0 });
        if (doc.id === playerId) {
            playerRank = idx + 1;
            playerScore = data.score || 0;
        }
    });
    
    const gameDoc = await gameRef.get();
    const totalQuestions = gameDoc.data()?.questions.length || 0;
    
    const resultsHtml = `
        <div class="card text-center">
            <div style="font-size:3rem;">🏆</div>
            <h2>Game Over!</h2>
            <h3>Your Score: ${playerScore} / ${totalQuestions * 100}</h3>
            <h3>Position: #${playerRank} of ${players.length}</h3>
            <hr>
            <h3>Final Leaderboard</h3>
            <div class="leaderboard">
                ${players.map((p, idx) => `
                    <div class="leaderboard-entry ${idx === 0 ? 'top-1' : ''}">
                        <span>${idx === 0 ? '👑' : `${idx + 1}.`} ${escapeHtml(p.name)}</span>
                        <span>⭐ ${p.score} pts</span>
                    </div>
                `).join('')}
            </div>
            <button id="playAgainBtn" class="btn btn-primary mt-20">Play Again</button>
        </div>
    `;
    
    const playerPanel = document.getElementById('playerPanel');
    const oldResults = document.getElementById('gameResults');
    if (oldResults) oldResults.remove();
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'gameResults';
    resultsDiv.innerHTML = resultsHtml;
    playerPanel.appendChild(resultsDiv);
    
    document.getElementById('playAgainBtn')?.addEventListener('click', () => location.reload());
}