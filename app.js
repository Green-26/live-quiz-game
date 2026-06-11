// ==================== APP.JS - MAIN GAME LOGIC ====================
// Note: Uses global variables from config.js (db, auth, escapeHtml, setLoading)

let localQuestions = [];
let isHost = false;
let studentId = null;
let gameUnsubscribe = null;
let playersUnsubscribe = null;
let questionUnsubscribe = null;
let questionTimer = null;
let hasAnsweredFlag = false;

// ==================== UI FUNCTIONS ====================
function showPanel(id) { document.getElementById(id).classList.remove('hidden'); }
function hidePanel(id) { document.getElementById(id).classList.add('hidden'); }

// ==================== QUESTION FORM ====================
function renderQuestionBuilder() {
    const type = document.getElementById('questionType').value;
    const container = document.getElementById('questionForm');
    
    let html = '<input type="text" id="qText" class="input-field" placeholder="Enter your question..." style="margin-bottom:15px;">';
    
    if (type === 'multiple_choice') {
        html += `
            <input type="text" id="opt1" class="input-field" placeholder="Option A" style="margin-bottom:15px;">
            <input type="text" id="opt2" class="input-field" placeholder="Option B" style="margin-bottom:15px;">
            <input type="text" id="opt3" class="input-field" placeholder="Option C" style="margin-bottom:15px;">
            <input type="text" id="opt4" class="input-field" placeholder="Option D" style="margin-bottom:15px;">
            <select id="correctOpt" class="input-field" style="margin-bottom:15px;">
                <option value="0">Option A is correct</option>
                <option value="1">Option B is correct</option>
                <option value="2">Option C is correct</option>
                <option value="3">Option D is correct</option>
            </select>
        `;
    } else if (type === 'true_false') {
        html += `<select id="correctOpt" class="input-field" style="margin-bottom:15px;"><option value="true">True</option><option value="false">False</option></select>`;
    } else if (type === 'fill_blank') {
        html += `<input type="text" id="correctAnswer" class="input-field" placeholder="Correct answer" style="margin-bottom:15px;">`;
    } else if (type === 'numeric') {
        html += `
            <input type="number" id="correctValue" class="input-field" placeholder="Correct answer" style="margin-bottom:15px;">
            <input type="text" id="unit" class="input-field" placeholder="Unit (optional)" style="margin-bottom:15px;">
        `;
    }
    
    html += `<input type="number" id="points" class="input-field" placeholder="Points" value="100">`;
    container.innerHTML = html;
}

function buildQuestionObject() {
    const type = document.getElementById('questionType').value;
    const text = document.getElementById('qText')?.value.trim();
    const difficulty = document.getElementById('difficulty').value;
    const points = parseInt(document.getElementById('points')?.value) || 100;
    
    if (!text) { alert('Please enter a question'); return null; }
    
    const question = { id: Date.now(), type, text, difficulty, points };
    
    if (type === 'multiple_choice') {
        const opt1 = document.getElementById('opt1')?.value.trim();
        const opt2 = document.getElementById('opt2')?.value.trim();
        const opt3 = document.getElementById('opt3')?.value.trim();
        const opt4 = document.getElementById('opt4')?.value.trim();
        if (!opt1 || !opt2 || !opt3 || !opt4) { alert('All options required'); return null; }
        question.options = [opt1, opt2, opt3, opt4];
        question.correctAnswer = parseInt(document.getElementById('correctOpt').value);
    } else if (type === 'true_false') {
        question.correctAnswer = document.getElementById('correctOpt').value === 'true';
    } else if (type === 'fill_blank') {
        const correct = document.getElementById('correctAnswer')?.value.trim();
        if (!correct) { alert('Correct answer required'); return null; }
        question.correctAnswer = correct;
    } else if (type === 'numeric') {
        const correct = parseFloat(document.getElementById('correctValue')?.value);
        if (isNaN(correct)) { alert('Correct value required'); return null; }
        question.correctAnswer = correct;
        question.unit = document.getElementById('unit')?.value || '';
    }
    return question;
}

function updateQuestionsDisplay() {
    const container = document.getElementById('questionsList');
    if (!localQuestions.length) {
        container.innerHTML = '<p style="text-align:center; color:#718096;">No questions yet. Add some!</p>';
        return;
    }
    
    container.innerHTML = localQuestions.map((q, i) => `
        <div class="question-item">
            <div><strong>${i+1}.</strong> ${escapeHtml(q.text.substring(0, 50))} 🎯 ${q.points} pts</div>
            <button class="remove-q-btn" data-index="${i}">✖ Remove</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-q-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(btn.dataset.index);
            localQuestions.splice(idx, 1);
            updateQuestionsDisplay();
        });
    });
}

function addNewQuestion() { const q = buildQuestionObject(); if (q) { localQuestions.push(q); updateQuestionsDisplay(); document.getElementById('qText').value = ''; alert('Question added!'); } }
function addExampleQuestions() {
    localQuestions.push({ id: Date.now()+1, type: 'multiple_choice', text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correctAnswer: 1, difficulty: 'easy', points: 100 });
    localQuestions.push({ id: Date.now()+2, type: 'true_false', text: 'The Earth is flat', correctAnswer: false, difficulty: 'easy', points: 50 });
    localQuestions.push({ id: Date.now()+3, type: 'numeric', text: 'What is 15 + 27?', correctAnswer: 42, difficulty: 'easy', points: 75 });
    updateQuestionsDisplay();
    alert('Sample questions added!');
}
function clearAllLocalQuestions() { if (confirm('Clear all questions?')) { localQuestions = []; updateQuestionsDisplay(); } }

// ==================== HOST FUNCTIONS ====================
async function createAndLaunchGame() {
    if (!localQuestions.length) { alert('Please add questions first!'); return; }
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentGamePin = pin;
    
    try {
        const user = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);
        await gameRef.set({
            pin: pin, status: 'waiting', currentQuestionIndex: -1,
            questions: localQuestions, hostId: user.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentGameRef = gameRef;
        isHost = true;
        
        hidePanel('hostPanel');
        showPanel('gameDashboard');
        document.getElementById('gamePin').innerText = pin;
        document.getElementById('gameStatusMsg').innerHTML = `📌 Game created! PIN: ${pin} - Share with students. Click START when ready.`;
        
        attachHostListeners();
    } catch (error) { alert('Error: ' + error.message); }
}

async function attachHostListeners() {
    if (gameUnsubscribe) gameUnsubscribe();
    if (playersUnsubscribe) playersUnsubscribe();
    
    gameUnsubscribe = currentGameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        const startBtn = document.getElementById('startGameBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        
        if (data.status === 'active') {
            startBtn.disabled = true;
            const current = data.currentQuestionIndex;
            const total = data.questions.length;
            nextBtn.disabled = (current + 1 >= total);
            if (current >= 0) {
                document.getElementById('currentQuestionDisplay').innerHTML = `<strong>Question ${current+1}/${total}</strong><br>${escapeHtml(data.questions[current].text)}`;
            }
            document.getElementById('gameStatusMsg').innerHTML = `📢 Question ${current+1}/${total} LIVE! Students answering...`;
        } else if (data.status === 'waiting') {
            startBtn.disabled = false;
            nextBtn.disabled = true;
            document.getElementById('currentQuestionDisplay').innerHTML = 'Click START GAME to begin';
            document.getElementById('gameStatusMsg').innerHTML = `📌 PIN: ${data.pin} - Share with students. Click START when ready.`;
        } else if (data.status === 'ended') {
            startBtn.disabled = true;
            nextBtn.disabled = true;
            document.getElementById('gameStatusMsg').innerHTML = '🏁 Game ended!';
        }
    });
    
    const playersRef = currentGameRef.collection('players');
    playersUnsubscribe = playersRef.onSnapshot(snapshot => {
        const players = [];
        snapshot.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
        players.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        const container = document.getElementById('leaderboardList');
        const countSpan = document.getElementById('playerCount');
        
        if (!players.length) {
            container.innerHTML = '<div class="leaderboard-entry">No players yet. Share the PIN!</div>';
            countSpan.innerHTML = '👥 0 players joined';
        } else {
            container.innerHTML = players.map((p, i) => `
                <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                    <span>${i === 0 ? '👑' : i+1}. ${escapeHtml(p.name)}</span>
                    <span>⭐ ${p.score || 0}</span>
                </div>
            `).join('');
            countSpan.innerHTML = `👥 ${players.length} player(s) joined`;
        }
        
        const totalScore = players.reduce((sum, p) => sum + (p.score || 0), 0);
        const avgScore = players.length ? Math.round(totalScore / players.length) : 0;
        const topScore = players.length ? players[0].score || 0 : 0;
        document.getElementById('statsDisplay').innerHTML = `
            <div class="leaderboard-entry">📊 Average: ${avgScore}</div>
            <div class="leaderboard-entry">🏆 Highest: ${topScore}</div>
            <div class="leaderboard-entry">👥 Total: ${players.length}</div>
        `;
    });
}

async function startGameHost() { await currentGameRef.update({ status: 'active', currentQuestionIndex: -1 }); document.getElementById('gameStatusMsg').innerHTML = '🚀 Game started! Click NEXT QUESTION.'; document.getElementById('nextQuestionBtn').disabled = false; }

async function sendNextQuestionHost() {
    const doc = await currentGameRef.get();
    const data = doc.data();
    let nextIdx = (data.currentQuestionIndex || -1) + 1;
    
    if (nextIdx >= data.questions.length) {
        await currentGameRef.update({ status: 'ended' });
        alert('Quiz completed!');
        return;
    }
    
    await currentGameRef.update({ currentQuestionIndex: nextIdx });
    
    const activeRef = currentGameRef.collection('activeQuestion').doc('current');
    await activeRef.set({
        question: data.questions[nextIdx],
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
        isActive: true, questionIndex: nextIdx
    });
    
    document.getElementById('nextQuestionBtn').disabled = true;
    document.getElementById('gameStatusMsg').innerHTML = `📢 Question ${nextIdx+1}/${data.questions.length} LIVE!`;
    
    if (questionTimer) clearTimeout(questionTimer);
    questionTimer = setTimeout(async () => {
        const active = await currentGameRef.collection('activeQuestion').doc('current').get();
        if (active.exists && active.data()?.isActive) {
            await activeRef.update({ isActive: false });
            document.getElementById('gameStatusMsg').innerHTML = `⏰ Time\'s up! Click NEXT.`;
            document.getElementById('nextQuestionBtn').disabled = false;
        }
    }, 15000);
}

async function endGameHost() {
    if (confirm('End the game?')) {
        if (questionTimer) clearTimeout(questionTimer);
        await currentGameRef.update({ status: 'ended' });
        document.getElementById('nextQuestionBtn').disabled = true;
        document.getElementById('startGameBtn').disabled = true;
    }
}

// ==================== STUDENT FUNCTIONS ====================
async function joinStudentGame() {
    const name = document.getElementById('studentNameInput').value.trim();
    const pin = document.getElementById('gamePinInput').value.trim();
    
    if (!name || !pin) { document.getElementById('joinErrorMsg').innerText = 'Enter name and PIN'; return; }
    
    const gameRef = db.collection('games').doc(pin);
    const gameDoc = await gameRef.get();
    if (!gameDoc.exists) { document.getElementById('joinErrorMsg').innerText = 'Game not found!'; return; }
    if (gameDoc.data().status === 'ended') { document.getElementById('joinErrorMsg').innerText = 'Game ended'; return; }
    
    try {
        const user = await auth.signInAnonymously();
        studentId = user.user.uid;
        currentGameRef = gameRef;
        await gameRef.collection('players').doc(studentId).set({ name, score: 0, joinedAt: firebase.firestore.FieldValue.serverTimestamp() });
        
        hidePanel('studentPanel');
        showPanel('waitingArea');
        document.getElementById('studentNameDisplay').innerText = name;
        document.getElementById('pinDisplay').innerText = pin;
        
        attachStudentListeners();
    } catch (error) { document.getElementById('joinErrorMsg').innerText = 'Failed: ' + error.message; }
}

function attachStudentListeners() {
    if (gameUnsubscribe) gameUnsubscribe();
    if (questionUnsubscribe) questionUnsubscribe();
    if (playersUnsubscribe) playersUnsubscribe();
    
    gameUnsubscribe = currentGameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.status === 'waiting') { hidePanel('quizAreaStudent'); showPanel('waitingArea'); hidePanel('resultsArea'); }
        else if (data.status === 'active') { hidePanel('waitingArea'); showPanel('quizAreaStudent'); hidePanel('resultsArea'); }
        else if (data.status === 'ended') { hidePanel('quizAreaStudent'); hidePanel('waitingArea'); showStudentFinalResults(); }
    });
    
    questionUnsubscribe = currentGameRef.collection('activeQuestion').doc('current').onSnapshot(snap => {
        if (!snap.exists || !snap.data().isActive) { document.getElementById('questionContainer').innerHTML = '<div class="text-center">⏳ Getting next question...</div>'; return; }
        hasAnsweredFlag = false;
        const data = snap.data();
        const question = data.question;
        const expiry = data.expiresAt.toDate();
        renderStudentQuestionUI(question);
        startStudentTimer(expiry);
        attachStudentAnswerHandler(question, async (answer) => { if (!hasAnsweredFlag) { hasAnsweredFlag = true; await submitStudentAnswer(answer, question, data.questionIndex, expiry); } });
    });
    
    const scoreRef = currentGameRef.collection('players').doc(studentId);
    playersUnsubscribe = scoreRef.onSnapshot(doc => { if (doc.exists) { document.getElementById('scoreDisplay').innerText = doc.data()?.score || 0; } });
}

function renderStudentQuestionUI(question) {
    if (question.type === 'multiple_choice') {
        document.getElementById('questionContainer').innerHTML = `<h2>${escapeHtml(question.text)}</h2><div class="options-container">${question.options.map((opt, i) => `<div class="option" data-ans="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>`).join('')}</div>`;
    } else if (question.type === 'true_false') {
        document.getElementById('questionContainer').innerHTML = `<h2>${escapeHtml(question.text)}</h2><div class="tf-options"><div class="tf-option true" data-ans="true">✅ TRUE</div><div class="tf-option false" data-ans="false">❌ FALSE</div></div>`;
    } else if (question.type === 'fill_blank') {
        document.getElementById('questionContainer').innerHTML = `<h2>${escapeHtml(question.text)}</h2><input type="text" id="fillAnswerInput" class="blank-input"><button id="submitAnswerStudentBtn" class="btn btn-primary">Submit Answer</button>`;
    } else if (question.type === 'numeric') {
        document.getElementById('questionContainer').innerHTML = `<h2>${escapeHtml(question.text)}</h2><input type="number" id="numericAnswerInput" class="blank-input"><button id="submitAnswerStudentBtn" class="btn btn-primary">Submit Answer</button>`;
    }
}

function attachStudentAnswerHandler(question, handler) {
    if (question.type === 'multiple_choice') {
        document.querySelectorAll('.option').forEach(opt => { opt.onclick = () => handler(parseInt(opt.dataset.ans)); });
    } else if (question.type === 'true_false') {
        document.querySelectorAll('.tf-option').forEach(opt => { opt.onclick = () => handler(opt.dataset.ans === 'true'); });
    } else {
        const btn = document.getElementById('submitAnswerStudentBtn');
        if (btn) {
            btn.onclick = () => {
                const input = document.getElementById(question.type === 'fill_blank' ? 'fillAnswerInput' : 'numericAnswerInput');
                const value = question.type === 'numeric' ? parseFloat(input.value) : input.value;
                if (value || value === 0) handler(value);
                else alert('Enter an answer');
            };
        }
    }
}

function startStudentTimer(expiry) {
    if (window.timerInterval) clearInterval(window.timerInterval);
    window.timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
        const timerDiv = document.getElementById('timerDisplay');
        timerDiv.innerText = remaining;
        if (remaining <= 5) timerDiv.classList.add('timer-warning');
        else timerDiv.classList.remove('timer-warning');
        if (remaining <= 0) clearInterval(window.timerInterval);
    }, 200);
}

async function submitStudentAnswer(answer, question, qIndex, expiry) {
    const isCorrect = validateStudentAnswer(question, answer);
    const timeLeft = Math.max(0, (expiry.getTime() - Date.now()) / 1000);
    const points = calculateStudentPoints(question, timeLeft, isCorrect);
    
    const feedback = document.getElementById('feedbackArea');
    if (isCorrect) { feedback.innerHTML = `<div style="background:#c6f6d5; padding:15px; border-radius:12px;">✅ CORRECT! +${points} points!</div>`; }
    else { feedback.innerHTML = `<div style="background:#fed7d7; padding:15px; border-radius:12px;">❌ Wrong! Answer: ${getCorrectAnswerText(question)}</div>`; }
    
    await currentGameRef.collection('players').doc(studentId).collection('answers').doc(`q${qIndex}`).set({ answer, correct: isCorrect, points, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    const playerDoc = await currentGameRef.collection('players').doc(studentId).get();
    await currentGameRef.collection('players').doc(studentId).update({ score: (playerDoc.data()?.score || 0) + points });
    
    document.querySelectorAll('.option, .tf-option, #submitAnswerStudentBtn').forEach(el => { if (el.tagName === 'BUTTON') el.disabled = true; else el.style.pointerEvents = 'none'; });
}

function validateStudentAnswer(question, answer) {
    if (question.type === 'multiple_choice') return answer === question.correctAnswer;
    if (question.type === 'true_false') return String(answer) === String(question.correctAnswer);
    if (question.type === 'fill_blank') return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase();
    if (question.type === 'numeric') return Math.abs(answer - question.correctAnswer) <= 0.01;
    return false;
}

function calculateStudentPoints(question, timeLeft, correct) {
    if (!correct) return 0;
    const bonus = Math.floor((timeLeft / 15) * 50);
    const multiplier = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((question.points + bonus) * (multiplier[question.difficulty] || 1));
}

function getCorrectAnswerText(question) {
    if (question.type === 'multiple_choice') return question.options[question.correctAnswer];
    if (question.type === 'true_false') return question.correctAnswer ? 'True' : 'False';
    if (question.type === 'fill_blank') return question.correctAnswer;
    if (question.type === 'numeric') return `${question.correctAnswer} ${question.unit || ''}`;
    return 'Unknown';
}

async function showStudentFinalResults() {
    const playersSnap = await currentGameRef.collection('players').orderBy('score', 'desc').get();
    const players = []; let rank = 0, myScore = 0;
    playersSnap.forEach((doc, i) => { const d = doc.data(); players.push({ name: d.name, score: d.score || 0 }); if (doc.id === studentId) { rank = i + 1; myScore = d.score || 0; } });
    const gameDoc = await currentGameRef.get(); const totalQ = gameDoc.data()?.questions.length || 0;
    document.getElementById('resultsArea').innerHTML = `<div class="card"><div style="font-size:50px;">🏆</div><h2>Game Over!</h2><h3>Your Score: ${myScore} / ${totalQ * 100}</h3><h3>Position: #${rank} of ${players.length}</h3><hr><h3>Final Leaderboard</h3>${players.map((p, i) => `<div class="leaderboard-entry ${i === 0 ? 'top1' : ''}" style="${i+1 === rank ? 'background:#c6f6d5; font-weight:bold;' : ''}"><span>${i === 0 ? '👑' : i+1}. ${escapeHtml(p.name)}</span><span>⭐ ${p.score}</span></div>`).join('')}<button id="playAgainButton" class="btn btn-primary mt-20">Play Again</button></div>`;
    hidePanel('quizAreaStudent'); showPanel('resultsArea');
    document.getElementById('playAgainButton')?.addEventListener('click', () => location.reload());
}

// ==================== NAVIGATION ====================
function showHostScreen() { hidePanel('landingPage'); showPanel('hostPanel'); hidePanel('gameDashboard'); hidePanel('studentPanel'); renderQuestionBuilder(); updateQuestionsDisplay(); }
function showStudentScreen() { hidePanel('landingPage'); hidePanel('hostPanel'); hidePanel('gameDashboard'); showPanel('studentPanel'); document.getElementById('studentNameInput').value = ''; document.getElementById('gamePinInput').value = ''; }
function goBackToLanding() { if (gameUnsubscribe) gameUnsubscribe(); if (playersUnsubscribe) playersUnsubscribe(); if (questionUnsubscribe) questionUnsubscribe(); if (questionTimer) clearTimeout(questionTimer); hidePanel('hostPanel'); hidePanel('gameDashboard'); hidePanel('studentPanel'); showPanel('landingPage'); }

// ==================== 3D BACKGROUND ====================
function init3DBackground() {
    const canvas = document.getElementById('bgCanvas');
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050510);
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 25);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const earthGeo = new THREE.SphereGeometry(2, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x2266aa, emissive: 0x113366, emissiveIntensity: 0.3 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);
    
    const particleCount = 1500;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const r = 3.5 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.8;
        positions[i*3+2] = r * Math.cos(phi);
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMat = new THREE.PointsMaterial({ color: 0x66aaff, size: 0.08, transparent: true, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);
    
    const ambient = new THREE.AmbientLight(0x111122); scene.add(ambient);
    const light = new THREE.PointLight(0x4488ff, 0.5); light.position.set(2, 3, 4); scene.add(light);
    
    let time = 0;
    function animate() { requestAnimationFrame(animate); time += 0.005; earth.rotation.y = time * 0.1; particles.rotation.y = time * 0.05; renderer.render(scene, camera); }
    animate();
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
}

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
    init3DBackground();
    
    document.getElementById('hostNewGameBtn').onclick = showHostScreen;
    document.getElementById('joinGameBtn').onclick = showStudentScreen;
    document.getElementById('backFromHost').onclick = goBackToLanding;
    document.getElementById('backFromStudent').onclick = goBackToLanding;
    document.getElementById('exitGameBtn').onclick = goBackToLanding;
    
    document.getElementById('addQuestion').onclick = addNewQuestion;
    document.getElementById('addSample').onclick = addExampleQuestions;
    document.getElementById('clearAll').onclick = clearAllLocalQuestions;
    document.getElementById('questionType').onchange = renderQuestionBuilder;
    document.getElementById('createGame').onclick = createAndLaunchGame;
    
    document.getElementById('startGameBtn').onclick = startGameHost;
    document.getElementById('nextQuestionBtn').onclick = sendNextQuestionHost;
    document.getElementById('endGameBtn').onclick = endGameHost;
    
    document.getElementById('joinGameBtn2').onclick = joinStudentGame;
    
    renderQuestionBuilder();
    updateQuestionsDisplay();
});