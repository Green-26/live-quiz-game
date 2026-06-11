// ==================== PLAYER FUNCTIONS ====================
let hasAnsweredCurrent = false;
let playerId = null;

async function joinGame() {
    const name = document.getElementById('playerNameInput').value.trim();
    const pin = document.getElementById('gamePinInput').value.trim();
    
    if (!name || !pin) {
        document.getElementById('authError').innerText = 'Enter name and PIN';
        return;
    }
    
    setLoading('Joining game');
    
    try {
        const gameRef = db.collection('games').doc(pin);
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists) {
            document.getElementById('authError').innerText = 'Game not found!';
            return;
        }
        
        const user = await auth.signInAnonymously();
        playerId = user.user.uid;
        
        await gameRef.collection('players').doc(playerId).set({
            name: name,
            score: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentUser = { uid: playerId, isHost: false, gameId: pin, playerName: name };
        sessionStorage.setItem('quizUser', JSON.stringify(currentUser));
        
        switchToPlayer(pin, name);
        attachPlayerListeners(gameRef);
        
    } catch (error) {
        console.error(error);
        document.getElementById('authError').innerText = 'Failed to join: ' + error.message;
    }
}

async function attachPlayerListeners(gameRef) {
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
            showGameResults(gameRef);
        }
    });
    
    const activeRef = gameRef.collection('activeQuestion').doc('current');
    activeQuestionListener = activeRef.onSnapshot(async (snap) => {
        if (!snap.exists || !snap.data().isActive) {
            document.getElementById('questionContainer').innerHTML = '<div class="text-center">⏳ Getting next question...</div>';
            return;
        }
        
        hasAnsweredCurrent = false;
        const data = snap.data();
        const question = data.question;
        const expiresAt = data.expiresAt.toDate();
        const qIndex = data.questionIndex;
        
        document.getElementById('questionContainer').innerHTML = renderQuestionForPlayer(question);
        startTimer(expiresAt);
        
        const answerHandler = async (answer) => {
            if (hasAnsweredCurrent) return;
            hasAnsweredCurrent = true;
            await submitAnswer(gameRef, answer, question, qIndex, expiresAt);
        };
        
        attachAnswerListeners(question, answerHandler);
    });
    
    const scoreRef = gameRef.collection('players').doc(playerId);
    if (unsubPlayers) unsubPlayers();
    unsubPlayers = scoreRef.onSnapshot(doc => {
        if (doc.exists) {
            document.getElementById('playerScoreDisplay').innerText = doc.data()?.score || 0;
        }
    });
}

function attachAnswerListeners(question, handler) {
    if (question.type === 'multiple_choice') {
        document.querySelectorAll('.option').forEach(opt => {
            opt.onclick = () => handler(parseInt(opt.dataset.answer));
        });
    } else if (question.type === 'true_false') {
        document.querySelectorAll('.tf-option').forEach(opt => {
            opt.onclick = () => handler(opt.dataset.answer === 'true');
        });
    } else if (question.type === 'fill_blank') {
        const btn = document.getElementById('submitFillBtn');
        if (btn) btn.onclick = () => handler(document.getElementById('fillAnswer').value);
    } else if (question.type === 'numeric') {
        const btn = document.getElementById('submitNumericBtn');
        if (btn) btn.onclick = () => handler(parseFloat(document.getElementById('numericAnswer').value));
    }
}

async function submitAnswer(gameRef, answer, question, qIndex, expiresAt) {
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
            feedback.innerHTML = `<div style="background:#fed7d7; padding:15px; border-radius:12px;">❌ Wrong! Answer: ${getCorrectAnswerText(question)}</div>`;
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
        
        // Disable inputs
        document.querySelectorAll('.option, .tf-option, button').forEach(el => {
            if (el.tagName === 'BUTTON') el.disabled = true;
            else el.style.pointerEvents = 'none';
        });
        
    } catch (error) {
        console.error(error);
        document.getElementById('answerFeedback').innerHTML = '<p style="color:#f56565;">Failed to submit</p>';
        hasAnsweredCurrent = false;
    }
}

function startTimer(expiresAt) {
    if (window.timerInterval) clearInterval(window.timerInterval);
    
    window.timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        const timer = document.getElementById('timerCircle');
        timer.innerText = remaining;
        
        if (remaining <= 5) {
            timer.classList.add('timer-warning');
        } else {
            timer.classList.remove('timer-warning');
        }
        
        if (remaining <= 0) clearInterval(window.timerInterval);
    }, 200);
}

async function showGameResults(gameRef) {
    const playersSnap = await gameRef.collection('players').orderBy('score', 'desc').get();
    const players = [];
    let rank = 0;
    let myScore = 0;
    
    playersSnap.forEach((doc, i) => {
        const data = doc.data();
        players.push({ name: data.name, score: data.score || 0 });
        if (doc.id === playerId) {
            rank = i + 1;
            myScore = data.score || 0;
        }
    });
    
    const gameDoc = await gameRef.get();
    const total = gameDoc.data()?.questions.length || 0;
    const maxScore = total * 100;
    
    const resultsHtml = `
        <div class="card text-center">
            <div style="font-size:50px;">🏆</div>
            <h2>Game Over!</h2>
            <h3>Your Score: ${myScore} / ${maxScore}</h3>
            <h3>Position: #${rank} of ${players.length}</h3>
            <hr>
            <h3>Final Leaderboard</h3>
            <div class="leaderboard">
                ${players.map((p, i) => `
                    <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                        <span>${i === 0 ? '👑' : `${i+1}.`} ${escapeHtml(p.name)}</span>
                        <span>⭐ ${p.score}</span>
                    </div>
                `).join('')}
            </div>
            <button id="playAgainBtn" class="btn btn-primary mt-20">Play Again</button>
        </div>
    `;
    
    const oldResults = document.getElementById('gameResults');
    if (oldResults) oldResults.remove();
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'gameResults';
    resultsDiv.innerHTML = resultsHtml;
    document.getElementById('playerPanel').appendChild(resultsDiv);
    
    document.getElementById('playAgainBtn')?.addEventListener('click', () => location.reload());
}