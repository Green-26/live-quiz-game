// ==================== GAME STATE ====================
let myQuestions = [];
let currentGame = null;
let myStudentId = null;
let isGameHost = false;
let currentPin = null;
let unsubscribeGame = null;
let unsubscribePlayers = null;
let unsubscribeQuestion = null;
let gameTimer = null;
let canAnswer = true;

// ==================== UI HELPERS ====================
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ==================== QUESTION BUILDER ====================
function renderQuestionForm() {
    const type = document.getElementById('qType').value;
    const container = document.getElementById('questionForm');
    
    let html = '<input type="text" id="qText" class="input" placeholder="Question">';
    
    if (type === 'mc') {
        html += `
            <input type="text" id="opt1" class="input" placeholder="Option A">
            <input type="text" id="opt2" class="input" placeholder="Option B">
            <input type="text" id="opt3" class="input" placeholder="Option C">
            <input type="text" id="opt4" class="input" placeholder="Option D">
            <select id="correctOpt" class="input">
                <option value="0">A is correct</option>
                <option value="1">B is correct</option>
                <option value="2">C is correct</option>
                <option value="3">D is correct</option>
            </select>
        `;
    } else if (type === 'tf') {
        html += `<select id="correctOpt" class="input"><option value="true">True</option><option value="false">False</option></select>`;
    } else if (type === 'fb') {
        html += `<input type="text" id="correctAns" class="input" placeholder="Correct answer">`;
    } else if (type === 'num') {
        html += `<input type="number" id="correctVal" class="input" placeholder="Correct answer">`;
    }
    
    html += `<input type="number" id="points" class="input" placeholder="Points" value="100">`;
    container.innerHTML = html;
}

function buildQuestion() {
    const type = document.getElementById('qType').value;
    const text = document.getElementById('qText')?.value.trim();
    const diff = document.getElementById('difficulty').value;
    const points = parseInt(document.getElementById('points')?.value) || 100;
    
    if (!text) { alert('Enter question'); return null; }
    
    const q = { id: Date.now(), type, text, difficulty: diff, points };
    
    if (type === 'mc') {
        const o1 = document.getElementById('opt1')?.value.trim();
        const o2 = document.getElementById('opt2')?.value.trim();
        const o3 = document.getElementById('opt3')?.value.trim();
        const o4 = document.getElementById('opt4')?.value.trim();
        if (!o1 || !o2 || !o3 || !o4) { alert('All options required'); return null; }
        q.options = [o1, o2, o3, o4];
        q.correct = parseInt(document.getElementById('correctOpt').value);
    } else if (type === 'tf') {
        q.correct = document.getElementById('correctOpt').value === 'true';
    } else if (type === 'fb') {
        const ca = document.getElementById('correctAns')?.value.trim();
        if (!ca) { alert('Correct answer required'); return null; }
        q.correct = ca;
    } else if (type === 'num') {
        const cv = parseFloat(document.getElementById('correctVal')?.value);
        if (isNaN(cv)) { alert('Correct value required'); return null; }
        q.correct = cv;
        q.unit = '';
    }
    return q;
}

function renderQuestions() {
    const container = document.getElementById('questionsList');
    if (!myQuestions.length) {
        container.innerHTML = '<p class="text-center">No questions yet</p>';
        return;
    }
    container.innerHTML = myQuestions.map((q, i) => `
        <div class="q-item">
            <div><strong>${i+1}.</strong> ${escapeHtml(q.text.substring(0, 50))} 🎯 ${q.points}pts</div>
            <button class="remove-q" data-idx="${i}">✖</button>
        </div>
    `).join('');
    document.querySelectorAll('.remove-q').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            myQuestions.splice(idx, 1);
            renderQuestions();
        };
    });
}

function addQuestion() { const q = buildQuestion(); if (q) { myQuestions.push(q); renderQuestions(); document.getElementById('qText').value = ''; alert('Added!'); } }
function addSamples() {
    myQuestions.push({ id: Date.now()+1, type: 'mc', text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correct: 1, difficulty: 'easy', points: 100 });
    myQuestions.push({ id: Date.now()+2, type: 'tf', text: 'The Earth is flat', correct: false, difficulty: 'easy', points: 50 });
    myQuestions.push({ id: Date.now()+3, type: 'num', text: '15 + 27 = ?', correct: 42, difficulty: 'easy', points: 75 });
    renderQuestions();
    alert('Samples added!');
}
function clearQuestions() { if (confirm('Clear all?')) { myQuestions = []; renderQuestions(); } }

// ==================== HOST FUNCTIONS ====================
async function createGame() {
    if (!myQuestions.length) { alert('Add questions first'); return; }
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentPin = pin;
    
    try {
        const user = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);
        
        await gameRef.set({
            pin: pin,
            status: 'waiting',
            currentIndex: -1,
            questions: myQuestions,
            hostId: user.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentGame = gameRef;
        isGameHost = true;
        
        hide('hostPanel');
        show('gameDashboard');
        document.getElementById('gamePin').innerText = pin;
        document.getElementById('statusMsg').innerHTML = `✅ Game created! PIN: ${pin} - Share with students. Click START.`;
        
        // Listen to game
        gameRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            const startBtn = document.getElementById('startGameControl');
            const nextBtn = document.getElementById('nextControl');
            
            if (data.status === 'active') {
                startBtn.disabled = true;
                const idx = data.currentIndex;
                const total = data.questions.length;
                nextBtn.disabled = (idx + 1 >= total);
                if (idx >= 0) {
                    document.getElementById('currentQDisplay').innerHTML = `<strong>Q${idx+1}/${total}</strong><br>${escapeHtml(data.questions[idx].text)}`;
                }
                document.getElementById('statusMsg').innerHTML = `📢 Question ${idx+1}/${total} LIVE!`;
            } else if (data.status === 'waiting') {
                startBtn.disabled = false;
                nextBtn.disabled = true;
                document.getElementById('statusMsg').innerHTML = `📌 PIN: ${pin} - Share with students. Click START.`;
            } else if (data.status === 'ended') {
                startBtn.disabled = true;
                nextBtn.disabled = true;
                document.getElementById('statusMsg').innerHTML = '🏁 Game ended!';
            }
        });
        
        // Listen to players
        gameRef.collection('players').onSnapshot((snap) => {
            const players = [];
            snap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
            players.sort((a, b) => (b.score || 0) - (a.score || 0));
            
            const container = document.getElementById('leaderboard');
            const countDiv = document.getElementById('playerCount');
            
            if (!players.length) {
                container.innerHTML = '<div class="leaderboard-entry">No players yet</div>';
                countDiv.innerHTML = '👥 0 players';
            } else {
                container.innerHTML = players.map((p, i) => `
                    <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                        <span>${i === 0 ? '👑' : i+1}. ${escapeHtml(p.name)}</span>
                        <span>⭐ ${p.score || 0}</span>
                    </div>
                `).join('');
                countDiv.innerHTML = `👥 ${players.length} player(s)`;
            }
            
            const total = players.reduce((s, p) => s + (p.score || 0), 0);
            const avg = players.length ? Math.round(total / players.length) : 0;
            const top = players.length ? players[0].score || 0 : 0;
            document.getElementById('stats').innerHTML = `
                <div class="leaderboard-entry">📊 Average: ${avg}</div>
                <div class="leaderboard-entry">🏆 Top: ${top}</div>
                <div class="leaderboard-entry">👥 Total: ${players.length}</div>
            `;
        });
        
    } catch (err) { alert('Error: ' + err.message); }
}

async function startGame() {
    if (!currentGame) return;
    await currentGame.update({ status: 'active', currentIndex: -1 });
    document.getElementById('statusMsg').innerHTML = '🚀 Game started! Click NEXT.';
    document.getElementById('nextControl').disabled = false;
}

async function nextQuestion() {
    if (!currentGame) return;
    
    const doc = await currentGame.get();
    const data = doc.data();
    let nextIdx = (data.currentIndex || -1) + 1;
    
    if (nextIdx >= data.questions.length) {
        await currentGame.update({ status: 'ended' });
        alert('Quiz completed!');
        return;
    }
    
    await currentGame.update({ currentIndex: nextIdx });
    
    const activeRef = currentGame.collection('activeQuestion').doc('current');
    await activeRef.set({
        question: data.questions[nextIdx],
        startedAt: firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
        isActive: true,
        index: nextIdx
    });
    
    document.getElementById('nextControl').disabled = true;
    document.getElementById('statusMsg').innerHTML = `📢 Question ${nextIdx+1}/${data.questions.length} LIVE!`;
    
    if (gameTimer) clearTimeout(gameTimer);
    gameTimer = setTimeout(async () => {
        const active = await currentGame.collection('activeQuestion').doc('current').get();
        if (active.exists && active.data()?.isActive) {
            await activeRef.update({ isActive: false });
            document.getElementById('statusMsg').innerHTML = `⏰ Time\'s up! Click NEXT.`;
            document.getElementById('nextControl').disabled = false;
        }
    }, 15000);
}

async function endGame() {
    if (!confirm('End game?')) return;
    if (gameTimer) clearTimeout(gameTimer);
    await currentGame.update({ status: 'ended' });
    document.getElementById('nextControl').disabled = true;
    document.getElementById('startGameControl').disabled = true;
}

// ==================== STUDENT FUNCTIONS ====================
async function joinGame() {
    const name = document.getElementById('studentName').value.trim();
    const pin = document.getElementById('gamePinStudent').value.trim();
    
    if (!name || !pin) {
        document.getElementById('joinError').innerHTML = 'Enter name and PIN';
        return;
    }
    
    const gameRef = db.collection('games').doc(pin);
    const gameDoc = await gameRef.get();
    
    if (!gameDoc.exists) {
        document.getElementById('joinError').innerHTML = 'Game not found!';
        return;
    }
    
    if (gameDoc.data().status === 'ended') {
        document.getElementById('joinError').innerHTML = 'Game ended';
        return;
    }
    
    try {
        const user = await auth.signInAnonymously();
        myStudentId = user.user.uid;
        currentGame = gameRef;
        currentPin = pin;
        
        await gameRef.collection('players').doc(myStudentId).set({
            name: name,
            score: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        hide('studentPanel');
        show('waitingArea');
        document.getElementById('studentNameDisplay').innerHTML = name;
        document.getElementById('pinDisplay').innerHTML = pin;
        document.getElementById('scoreDisplay').innerHTML = '0';
        
        // Listen to game status
        gameRef.onSnapshot((doc) => {
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
        
        // Listen to active question
        if (unsubscribeQuestion) unsubscribeQuestion();
        unsubscribeQuestion = gameRef.collection('activeQuestion').doc('current').onSnapshot((snap) => {
            if (!snap.exists || !snap.data().isActive) {
                document.getElementById('questionDisplay').innerHTML = '<div class="text-center">⏳ Waiting for question...</div>';
                return;
            }
            
            canAnswer = true;
            const data = snap.data();
            const q = data.question;
            const expiry = data.expiresAt.toDate();
            const qIdx = data.index;
            
            renderStudentQuestion(q);
            startTimer(expiry);
            
            attachAnswerListener(q, async (answer) => {
                if (canAnswer) {
                    canAnswer = false;
                    await submitAnswer(answer, q, qIdx, expiry);
                }
            });
        });
        
        // Listen to score
        gameRef.collection('players').doc(myStudentId).onSnapshot((doc) => {
            if (doc.exists) {
                document.getElementById('scoreDisplay').innerHTML = doc.data()?.score || 0;
            }
        });
        
    } catch (err) {
        document.getElementById('joinError').innerHTML = 'Failed: ' + err.message;
    }
}

function renderStudentQuestion(q) {
    if (q.type === 'mc') {
        document.getElementById('questionDisplay').innerHTML = `
            <h2>${escapeHtml(q.text)}</h2>
            <div class="options">
                ${q.options.map((opt, i) => `<div class="option" data-ans="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>`).join('')}
            </div>
        `;
    } else if (q.type === 'tf') {
        document.getElementById('questionDisplay').innerHTML = `
            <h2>${escapeHtml(q.text)}</h2>
            <div class="tf-group">
                <div class="tf-opt true" data-ans="true">✅ TRUE</div>
                <div class="tf-opt false" data-ans="false">❌ FALSE</div>
            </div>
        `;
    } else if (q.type === 'fb') {
        document.getElementById('questionDisplay').innerHTML = `
            <h2>${escapeHtml(q.text)}</h2>
            <input type="text" id="fbInput" class="blank-input" placeholder="Your answer">
            <button id="submitAnsBtn" class="btn btn-primary">Submit</button>
        `;
    } else if (q.type === 'num') {
        document.getElementById('questionDisplay').innerHTML = `
            <h2>${escapeHtml(q.text)}</h2>
            <input type="number" id="numInput" class="blank-input" placeholder="Your answer">
            <button id="submitAnsBtn" class="btn btn-primary">Submit</button>
        `;
    }
    document.getElementById('feedback').innerHTML = '';
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
            const btn = document.getElementById('submitAnsBtn');
            if (btn) {
                btn.onclick = () => {
                    const input = document.getElementById(q.type === 'fb' ? 'fbInput' : 'numInput');
                    let val = input.value;
                    if (q.type === 'num') val = parseFloat(val);
                    if (val || val === 0) handler(val);
                    else alert('Enter answer');
                };
            }
        }
    }, 100);
}

function startTimer(expiry) {
    if (window.timerInt) clearInterval(window.timerInt);
    window.timerInt = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
        const timerDiv = document.getElementById('timer');
        timerDiv.innerText = remaining;
        if (remaining <= 5) timerDiv.classList.add('timer-warning');
        else timerDiv.classList.remove('timer-warning');
        if (remaining <= 0) clearInterval(window.timerInt);
    }, 200);
}

async function submitAnswer(answer, q, qIdx, expiry) {
    const isCorrect = validateAnswer(q, answer);
    const timeLeft = Math.max(0, (expiry.getTime() - Date.now()) / 1000);
    const points = calcPoints(q, timeLeft, isCorrect);
    
    const feedback = document.getElementById('feedback');
    if (isCorrect) {
        feedback.innerHTML = `<div style="background:#c6f6d5; padding:15px; border-radius:12px;">✅ CORRECT! +${points} points!</div>`;
    } else {
        feedback.innerHTML = `<div style="background:#fed7d7; padding:15px; border-radius:12px;">❌ Wrong! Answer: ${getCorrectAnswer(q)}</div>`;
    }
    
    await currentGame.collection('players').doc(myStudentId).collection('answers').doc(`q${qIdx}`).set({
        answer, correct: isCorrect, points, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    const playerDoc = await currentGame.collection('players').doc(myStudentId).get();
    const newScore = (playerDoc.data()?.score || 0) + points;
    await currentGame.collection('players').doc(myStudentId).update({ score: newScore });
    
    document.querySelectorAll('.option, .tf-opt, #submitAnsBtn').forEach(el => {
        if (el.tagName === 'BUTTON') el.disabled = true;
        else el.style.pointerEvents = 'none';
    });
}

function validateAnswer(q, a) {
    if (q.type === 'mc') return a === q.correct;
    if (q.type === 'tf') return String(a) === String(q.correct);
    if (q.type === 'fb') return String(a).toLowerCase().trim() === String(q.correct).toLowerCase();
    if (q.type === 'num') return Math.abs(a - q.correct) <= 0.01;
    return false;
}

function calcPoints(q, timeLeft, correct) {
    if (!correct) return 0;
    const bonus = Math.floor((timeLeft / 15) * 50);
    const mult = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((q.points + bonus) * (mult[q.difficulty] || 1));
}

function getCorrectAnswer(q) {
    if (q.type === 'mc') return q.options[q.correct];
    if (q.type === 'tf') return q.correct ? 'True' : 'False';
    if (q.type === 'fb') return q.correct;
    if (q.type === 'num') return `${q.correct}`;
    return 'Unknown';
}

async function showResults() {
    const playersSnap = await currentGame.collection('players').orderBy('score', 'desc').get();
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
    
    const gameDoc = await currentGame.get();
    const total = gameDoc.data()?.questions.length || 0;
    
    document.getElementById('resultsArea').innerHTML = `
        <div class="card glass text-center">
            <div style="font-size:50px;">🏆</div>
            <h2>Game Over!</h2>
            <h3>Your Score: ${myScore} / ${total * 100}</h3>
            <h3>Position: #${rank} of ${players.length}</h3>
            <hr>
            <h3>Final Leaderboard</h3>
            ${players.map((p, i) => `
                <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}" style="${i+1 === rank ? 'background:#c6f6d5; font-weight:bold;' : ''}">
                    <span>${i === 0 ? '👑' : i+1}. ${escapeHtml(p.name)}</span>
                    <span>⭐ ${p.score}</span>
                </div>
            `).join('')}
            <button id="playAgainBtn" class="btn btn-primary mt-20">Play Again</button>
        </div>
    `;
    hide('quizArea');
    show('resultsArea');
    document.getElementById('playAgainBtn')?.onclick = () => location.reload();
}

// ==================== NAVIGATION ====================
function showHost() {
    hide('landingPage');
    show('hostPanel');
    hide('gameDashboard');
    hide('studentPanel');
    renderQuestionForm();
    renderQuestions();
}
function showStudent() {
    hide('landingPage');
    hide('hostPanel');
    hide('gameDashboard');
    show('studentPanel');
    document.getElementById('studentName').value = '';
    document.getElementById('gamePinStudent').value = '';
}
function backToLanding() {
    if (unsubscribeGame) unsubscribeGame();
    if (unsubscribePlayers) unsubscribePlayers();
    if (unsubscribeQuestion) unsubscribeQuestion();
    if (gameTimer) clearTimeout(gameTimer);
    if (window.timerInt) clearInterval(window.timerInt);
    hide('hostPanel');
    hide('gameDashboard');
    hide('studentPanel');
    show('landingPage');
}

// ==================== 3D NEURAL NETWORK BACKGROUND ====================
function init3D() {
    const canvas = document.getElementById('networkCanvas');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.0005);
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 28);
    
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Earth
    const earthGeo = new THREE.SphereGeometry(2.2, 128, 128);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x2266aa, emissive: 0x113366, emissiveIntensity: 0.4, metalness: 0.3, roughness: 0.5 });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);
    
    // Particles
    const particleCount = 2500;
    const particlesGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const r = 3.5 + Math.random() * 5;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i*3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
        positions[i*3+2] = r * Math.cos(phi);
        
        const hue = 0.55 + Math.random() * 0.3;
        const color = new THREE.Color().setHSL(hue, 1, 0.6);
        colors[i*3] = color.r;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(particlesGeo, particleMat);
    scene.add(particles);
    
    // Lines
    const linePositions = [];
    for (let i = 0; i < 3000; i++) {
        const i1 = Math.floor(Math.random() * particleCount);
        const i2 = Math.floor(Math.random() * particleCount);
        if (i1 !== i2) {
            linePositions.push(positions[i1*3], positions[i1*3+1], positions[i1*3+2]);
            linePositions.push(positions[i2*3], positions[i2*3+1], positions[i2*3+2]);
        }
    }
    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePositions), 3));
    const linesMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.2 });
    const lines = new THREE.LineSegments(linesGeo, linesMat);
    scene.add(lines);
    
    // Lights
    const ambient = new THREE.AmbientLight(0x111122);
    scene.add(ambient);
    const light1 = new THREE.PointLight(0x4488ff, 0.6);
    light1.position.set(3, 4, 5);
    scene.add(light1);
    const light2 = new THREE.PointLight(0xff44aa, 0.4);
    light2.position.set(-3, 2, -5);
    scene.add(light2);
    
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 0.3;
    });
    
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;
        
        earth.rotation.y = time * 0.1;
        particles.rotation.y = time * 0.03;
        particles.rotation.x = Math.sin(time * 0.2) * 0.1;
        lines.rotation.y = time * 0.02;
        
        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (mouseY + 5 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
        
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    init3D();
    
    document.getElementById('hostBtn').onclick = showHost;
    document.getElementById('studentJoinBtn').onclick = showStudent;
    document.getElementById('backHostBtn').onclick = backToLanding;
    document.getElementById('backStudentBtn').onclick = backToLanding;
    document.getElementById('exitControl').onclick = backToLanding;
    
    document.getElementById('addQBtn').onclick = addQuestion;
    document.getElementById('sampleBtn').onclick = addSamples;
    document.getElementById('clearBtn').onclick = clearQuestions;
    document.getElementById('qType').onchange = renderQuestionForm;
    document.getElementById('createGameBtn').onclick = createGame;
    
    document.getElementById('startGameControl').onclick = startGame;
    document.getElementById('nextControl').onclick = nextQuestion;
    document.getElementById('endControl').onclick = endGame;
    
    document.getElementById('joinGameControl').onclick = joinGame;
    
    renderQuestionForm();
});