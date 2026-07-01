// ==================== GAME PLAYER MODULE ====================

let myStudentId = null;
let canAnswer = true;
let hasAnsweredCurrent = false;

async function joinGame() {
    const name = document.getElementById('studentName').value.trim();
    const pin = document.getElementById('gamePinStudent').value.trim();

    const errorEl = document.getElementById('joinError');
    errorEl.classList.add('hidden');
    errorEl.innerHTML = '';

    if (!name || !pin) {
        errorEl.classList.remove('hidden');
        errorEl.innerHTML = 'Please enter your name and game PIN';
        return;
    }

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
        errorEl.classList.remove('hidden');
        errorEl.innerHTML = 'PIN must be exactly 6 digits';
        return;
    }

    setLoading(true, 'Joining game...');

    try {
        const gameRef = db.collection('games').doc(pin);
        const gameDoc = await gameRef.get();

        if (!gameDoc.exists) {
            errorEl.classList.remove('hidden');
            errorEl.innerHTML = 'Game not found! Check the PIN and try again.';
            setLoading(false);
            return;
        }

        const gameData = gameDoc.data();
        if (gameData.status === 'ended') {
            errorEl.classList.remove('hidden');
            errorEl.innerHTML = 'This game has already ended.';
            setLoading(false);
            return;
        }

        const user = await auth.signInAnonymously();
        myStudentId = user.user.uid;
        currentGameRef = gameRef;
        currentPin = pin;
        saveSession(pin, false);

        await gameRef.collection('players').doc(myStudentId).set({
            name: name,
            score: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        hide('studentPanel');
        show('waitingArea');
        document.getElementById('studentNameDisplay').innerText = name;
        document.getElementById('pinDisplay').innerText = pin;
        document.getElementById('scoreDisplay').innerText = '0';

        // Listen to game status
        unsubGame = gameRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();

            if (data.status === 'waiting') {
                hide('quizArea');
                show('waitingArea');
                hide('resultsArea');
            } else if (data.status === 'active') {
                hide('waitingArea');
                show('quizArea');
                hide('resultsArea');
            } else if (data.status === 'ended') {
                hide('quizArea');
                hide('waitingArea');
                showResults();
            }
        });

        // FIXED: Listen to active question
        unsubQuestion = gameRef.collection('activeQuestion').doc('current').onSnapshot((snap) => {
            console.log('📢 Student received question update:', snap.exists, snap.data()?.isActive);

            const qd = document.getElementById('questionDisplay');
            const fb = document.getElementById('feedback');
            const timerDiv = document.getElementById('timer');

            if (!snap.exists) {
                if (qd) qd.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px;">⏳ Waiting for question...</div>';
                return;
            }

            const questionData = snap.data();

            // If question is not active, show waiting message
            if (!questionData.isActive) {
                if (qd) qd.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px;">⏳ Getting next question ready...</div>';
                if (timerDiv) timerDiv.innerText = '15';
                if (fb) fb.innerHTML = '';
                return;
            }

            // Reset answer state for new question
            canAnswer = true;
            hasAnsweredCurrent = false;

            const question = questionData.question;
            const expiry = questionData.expiresAt.toDate();
            const qIdx = questionData.index;

            console.log('📢 Rendering question:', question.text, 'index:', qIdx);

            // Clear previous feedback and reset timer
            if (fb) fb.innerHTML = '';
            if (timerDiv) {
                timerDiv.innerText = '15';
                timerDiv.classList.remove('timer-warning');
            }

            // Render the question
            renderStudentQuestion(question);
            startTimer(expiry);

            // Attach answer listeners
            attachAnswerListener(question, async (answer) => {
                if (canAnswer && !hasAnsweredCurrent) {
                    hasAnsweredCurrent = true;
                    canAnswer = false;
                    await submitAnswer(answer, question, qIdx, expiry);
                }
            });
        });

        // Listen to score updates
        unsubScore = gameRef.collection('players').doc(myStudentId).onSnapshot((doc) => {
            if (doc.exists) {
                document.getElementById('scoreDisplay').innerText = doc.data()?.score || 0;
            }
        });

        showToast(`Joined game ${pin}!`, 'success');

    } catch (err) {
        errorEl.classList.remove('hidden');
        errorEl.innerHTML = 'Failed to join: ' + err.message;
        console.error(err);
    } finally {
        setLoading(false);
    }
}

function renderStudentQuestion(q) {
    const qd = document.getElementById('questionDisplay');
    const fb = document.getElementById('feedback');
    const timerDiv = document.getElementById('timer');

    if (fb) fb.innerHTML = '';
    if (timerDiv) {
        timerDiv.innerText = '15';
        timerDiv.classList.remove('timer-warning');
    }

    if (!qd) return;

    if (q.type === 'mc') {
        qd.innerHTML = `
            <h2 style="margin-bottom: 20px;">${escapeHtml(q.text)}</h2>
            <div class="options">
                ${q.options.map((opt, i) => `<div class="option" data-ans="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>`).join('')}
            </div>
        `;
    } else if (q.type === 'tf') {
        qd.innerHTML = `
            <h2 style="margin-bottom: 20px;">${escapeHtml(q.text)}</h2>
            <div class="tf-group">
                <div class="tf-opt true" data-ans="true">✅ TRUE</div>
                <div class="tf-opt false" data-ans="false">❌ FALSE</div>
            </div>
        `;
    } else if (q.type === 'fb') {
        qd.innerHTML = `
            <h2 style="margin-bottom: 20px;">${escapeHtml(q.text)}</h2>
            <input type="text" id="fbInput" class="blank-input" placeholder="Type your answer and press Enter...">
            <div class="field-note">Press Enter when your answer is ready.</div>
        `;
    } else if (q.type === 'num') {
        qd.innerHTML = `
            <h2 style="margin-bottom: 20px;">${escapeHtml(q.text)}</h2>
            <input type="number" id="numInput" class="blank-input" placeholder="Enter your answer and press Enter...">
            <div class="field-note">Press Enter when your answer is ready.</div>
        `;
    }
}

function attachAnswerListener(q, handler) {
    setTimeout(() => {
        if (q.type === 'mc') {
            document.querySelectorAll('.option').forEach(opt => {
                opt.onclick = () => handler(parseInt(opt.dataset.ans));
            });
        } else if (q.type === 'tf') {
            document.querySelectorAll('.tf-opt').forEach(opt => {
                opt.onclick = () => handler(opt.dataset.ans === 'true');
            });
        } else {
            const input = document.getElementById(q.type === 'fb' ? 'fbInput' : 'numInput');
            if (input) {
                input.onkeydown = (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        let val = input.value;
                        if (q.type === 'num') val = parseFloat(val);
                        if (val || val === 0) handler(val);
                        else showToast('Please enter an answer', 'error');
                    }
                };
            }
        }
    }, 100);
}

function startTimer(expiry) {
    if (window.timerInt) clearInterval(window.timerInt);
    const timerDiv = document.getElementById('timer');
    if (timerDiv) timerDiv.classList.remove('timer-warning');

    window.timerInt = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
        if (timerDiv) timerDiv.innerText = remaining;

        if (remaining <= 5) timerDiv.classList.add('timer-warning');
        else if (timerDiv) timerDiv.classList.remove('timer-warning');

        if (remaining <= 0) {
            clearInterval(window.timerInt);
            if (timerDiv) timerDiv.innerText = '0';
            if (!hasAnsweredCurrent) {
                canAnswer = false;
                hasAnsweredCurrent = true;
                const fb = document.getElementById('feedback');
                if (fb) fb.innerHTML = `<div class="feedback-wrong">⏰ Time's up! Your answer was not recorded.</div>`;
            }
        }
    }, 200);
}

async function submitAnswer(answer, q, qIdx, expiry) {
    const isCorrect = validateAnswer(q, answer);
    const timeLeft = Math.max(0, (expiry.getTime() - Date.now()) / 1000);
    const points = calcPoints(q, timeLeft, isCorrect);

    const feedback = document.getElementById('feedback');
    if (isCorrect) {
        feedback.innerHTML = `<div class="feedback-correct">✅ CORRECT! +${points} points!</div>`;
    } else {
        feedback.innerHTML = `<div class="feedback-wrong">❌ Wrong! The correct answer was: <strong>${getCorrectAnswerText(q)}</strong></div>`;
    }

    try {
        // Save answer
        await currentGameRef.collection('players').doc(myStudentId).collection('answers').doc(`q${qIdx}`).set({
            answer: answer,
            correct: isCorrect,
            points: points,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update score
        const playerDoc = await currentGameRef.collection('players').doc(myStudentId).get();
        const newScore = (playerDoc.data()?.score || 0) + points;
        await currentGameRef.collection('players').doc(myStudentId).update({ score: newScore });

        // Visual feedback - highlight correct/ wrong answers
        document.querySelectorAll('.option, .tf-opt').forEach(el => {
            el.style.pointerEvents = 'none';
            const ans = q.type === 'mc' ? parseInt(el.dataset.ans) : el.dataset.ans === 'true';
            if (ans === q.correct) el.classList.add('correct');
            else if ((q.type === 'mc' && ans === answer) || (q.type === 'tf' && ans === answer)) {
                if (!isCorrect) el.classList.add('wrong');
            }
        });

        const btn = document.getElementById('submitAnsBtn');
        if (btn) btn.disabled = true;

    } catch (err) {
        console.error('Submit error:', err);
        showToast('Failed to submit answer', 'error');
        canAnswer = true;
        hasAnsweredCurrent = false;
    }
}

function validateAnswer(q, a) {
    if (q.type === 'mc') return a === q.correct;
    if (q.type === 'tf') return String(a) === String(q.correct);
    if (q.type === 'fb') return String(a).toLowerCase().trim() === String(q.correct).toLowerCase();
    if (q.type === 'num') return Math.abs(parseFloat(a) - q.correct) <= 0.01;
    return false;
}

function calcPoints(q, timeLeft, correct) {
    if (!correct) return 0;
    const bonus = Math.floor((timeLeft / 15) * 50);
    const mult = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((q.points + bonus) * (mult[q.difficulty] || 1));
}

async function showResults() {
    if (!currentGameRef || !myStudentId) return;
    setLoading(true, 'Loading results...');

    try {
        const playersSnap = await currentGameRef.collection('players').orderBy('score', 'desc').get();
        const players = [];
        let rank = 0, myScore = 0;

        playersSnap.forEach((doc, i) => {
            const d = doc.data();
            players.push({ name: d.name, score: d.score || 0 });
            if (doc.id === myStudentId) {
                rank = i + 1;
                myScore = d.score || 0;
            }
        });

        const gameDoc = await currentGameRef.get();
        const total = gameDoc.data()?.questions.length || 0;
        const maxScore = total * 100;

        const resultsArea = document.getElementById('resultsArea');
        resultsArea.innerHTML = `
            <div class="card glass text-center" style="padding: 40px;">
                <div style="font-size: 60px; margin-bottom: 10px;">🏆</div>
                <h2 style="font-size: 2rem; margin-bottom: 5px;">Game Over!</h2>
                <div style="margin: 20px 0;">
                    <h3 style="color: var(--text-secondary);">Your Score</h3>
                    <div style="font-size: 3rem; font-weight: 800; background: linear-gradient(135deg, #ffd89b, #c7e9fb); -webkit-background-clip: text; background-clip: text; color: transparent;">${myScore}</div>
                    <div style="color: var(--text-secondary);">out of ${maxScore} possible</div>
                </div>
                <div style="margin: 20px 0;">
                    <h3 style="color: var(--text-secondary);">Your Position</h3>
                    <div style="font-size: 2rem; font-weight: 700; color: ${rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#fff'};">#${rank} of ${players.length}</div>
                </div>
                <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;">
                <h3 style="margin-bottom: 16px;">🏆 Final Leaderboard</h3>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${players.map((p, i) => `
                        <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}" 
                             style="${i+1 === rank ? 'background: rgba(17, 153, 142, 0.15); border: 1px solid rgba(17, 153, 142, 0.3); font-weight: 700;' : ''}">
                            <span>${i === 0 ? '👑' : i+1}. ${escapeHtml(p.name)} ${i+1 === rank ? '(You)' : ''}</span>
                            <span>⭐ ${p.score}</span>
                        </div>
                    `).join('')}
                </div>
                <button id="playAgainBtn" class="btn btn-primary mt-20" style="margin-top: 24px; padding: 16px 40px;">🔄 Play Again</button>
            </div>
        `;

        hide('quizArea');
        show('resultsArea');
        document.getElementById('playAgainBtn').onclick = () => location.reload();

    } catch (err) {
        console.error('Results error:', err);
        showToast('Failed to load results', 'error');
    } finally {
        setLoading(false);
    }
}
