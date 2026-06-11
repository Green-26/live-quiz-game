// ==================== PLAYER FUNCTIONS ====================
let playerGameRef = null;
let playerId = null;
let hasAnsweredCurrent = false;

async function joinGameAsStudent() {
    const name = document.getElementById('studentNameInput').value.trim();
    const pin = document.getElementById('gamePinInput').value.trim();
    
    if (!name || !pin) {
        document.getElementById('joinError').innerText = 'Please enter your name and game PIN';
        return;
    }
    
    setLoading('Joining game');
    
    try {
        const gameRef = db.collection('games').doc(pin);
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists) {
            document.getElementById('joinError').innerText = 'Game not found! Check the PIN.';
            return;
        }
        
        const gameData = gameDoc.data();
        if (gameData.status === 'ended') {
            document.getElementById('joinError').innerText = 'This game has already ended.';
            return;
        }
        
        const user = await auth.signInAnonymously();
        playerId = user.user.uid;
        playerGameRef = gameRef;
        
        await gameRef.collection('players').doc(playerId).set({
            name: name,
            score: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('studentJoinPage').classList.add('hidden');
        document.getElementById('studentWaitingArea').classList.remove('hidden');
        document.getElementById('studentNameDisplay').innerText = name;
        document.getElementById('studentPinDisplay').innerText = pin;
        
        attachStudentListeners(gameRef);
        
    } catch (error) {
        console.error(error);
        document.getElementById('joinError').innerText = 'Failed to join: ' + error.message;
    }
}

function attachStudentListeners(gameRef) {
    if (unsubGame) unsubGame();
    if (activeQuestionListener) activeQuestionListener();
    
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        
        if (data.status === 'created') {
            document.getElementById('studentWaitingArea').classList.remove('hidden');
            document.getElementById('studentQuizArea').classList.add('hidden');
            document.getElementById('studentResultsArea').classList.add('hidden');
        } else if (data.status === 'active') {
            document.getElementById('studentWaitingArea').classList.add('hidden');
            document.getElementById('studentQuizArea').classList.remove('hidden');
            document.getElementById('studentResultsArea').classList.add('hidden');
        } else if (data.status === 'ended') {
            document.getElementById('studentQuizArea').classList.add('hidden');
            showStudentResults(gameRef);
        }
    });
    
    const activeRef = gameRef.collection('activeQuestion').doc('current');
    activeQuestionListener = activeRef.onSnapshot(async (snap) => {
        if (!snap.exists || !snap.data().isActive) {
            document.getElementById('questionContainer').innerHTML = '<div class="text-center">⏳ Waiting for next question...</div>';
            return;
        }
        
        hasAnsweredCurrent = false;
        const data = snap.data();
        const question = data.question;
        const expiresAt = data.expiresAt.toDate();
        const qIndex = data.questionIndex;
        
        document.getElementById('questionContainer').innerHTML = renderQuestionForPlayer(question);
        startStudentTimer(expiresAt);
        
        const answerHandler = async (answer) => {
            if (hasAnsweredCurrent) {
                document.getElementById('answerFeedback').innerHTML = '<p style="color:#ed8936;">Already answered!</p>';
                return;
            }
            hasAnsweredCurrent = true;
            await submitStudentAnswer(gameRef, answer, question, qIndex, expiresAt);
        };
        
        attachStudentAnswerListeners(question, answerHandler);
    });
    
    const scoreRef = gameRef.collection('players').doc(playerId);
    if (unsubPlayers) unsubPlayers();
    unsubPlayers = scoreRef.onSnapshot(doc => {
        if (doc.exists) {
            document.getElementById('studentScoreDisplay').innerText = doc.data()?.score || 0;
        }
    });
}

function attachStudentAnswerListeners(question, handler) {
    if (question.type === 'multiple_choice') {
        document.querySelectorAll('.option').forEach(opt => {
            opt.onclick = () => handler(parseInt(opt.dataset.answer));
        });
    } else if (question.type === 'true_false') {
        document.querySelectorAll('.tf-option').forEach(opt => {
            opt.onclick = () => handler(opt.dataset.answer === 'true');
        });
    } else {
        const btn = document.getElementById('submitAnswerBtn');
        if (btn) {
            btn.onclick = () => {
                const input = document.getElementById(question.type === 'fill_blank' ? 'fillAnswer' : 'numericAnswer');
                const value = question.type === 'numeric' ? parseFloat(input.value) : input.value;
                if (value || value === 0) handler(value);
                else alert('Please enter an answer');
            };
        }
    }
}

async function submitStudentAnswer(gameRef, answer, question, qIndex, expiresAt) {
    try {
        const existing = await gameRef.collection('players').doc(playerId).collection('answers').doc(`q${qIndex}`).get();
        if (existing.exists) return;
        
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
        document.querySelectorAll('.option, .tf-option, #submitAnswerBtn').forEach(el => {
            if (el.tagName === 'BUTTON') el.disabled = true;
            else el.style.pointerEvents = 'none';
        });
        
    } catch (error) {
        console.error(error);
        document.getElementById('answerFeedback').innerHTML = '<p style="color:#f56565;">Failed to submit</p>';
        hasAnsweredCurrent = false;
    }
}

function startStudentTimer(expiresAt) {
    if (window.timerInterval) clearInterval(window.timerInterval);
    
    window.timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        const timer = document.getElementById('timerCircle');
        timer.innerText = remaining;
        
        if (remaining <= 5) timer.classList.add('timer-warning');
        else timer.classList.remove('timer-warning');
        
        if (remaining <= 0) clearInterval(window.timerInterval);
    }, 200);
}

async function showStudentResults(gameRef) {
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
                    <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}" style="${i+1 === rank ? 'background:#c6f6d5; font-weight:bold;' : ''}">
                        <span>${i === 0 ? '👑' : `${i+1}.`} ${escapeHtml(p.name)}</span>
                        <span>⭐ ${p.score}</span>
                    </div>
                `).join('')}
            </div>
            <button id="playAgainBtn" class="btn btn-primary mt-20">Play Again</button>
        </div>
    `;
    
    document.getElementById('studentQuizArea').classList.add('hidden');
    document.getElementById('studentResultsArea').classList.remove('hidden');
    document.getElementById('studentResultsArea').innerHTML = resultsHtml;
    
    document.getElementById('playAgainBtn')?.addEventListener('click', () => location.reload());
}