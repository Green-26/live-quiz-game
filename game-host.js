// ==================== HOST FUNCTIONS - FIXED ====================

let currentQuestionIndex = -1;
let totalQuestions = 0;

async function directHostNewGame(questions) {
    if (!questions || questions.length === 0) {
        alert('Please add some questions first!');
        return { success: false };
    }
    
    setLoading('Creating game');
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentGamePin = pin;
    currentQuestions = questions;
    currentQuestionIndex = -1;
    totalQuestions = questions.length;
    
    try {
        const userCredential = await auth.signInAnonymously();
        currentHostId = userCredential.user.uid;
        
        const gameRef = db.collection('games').doc(pin);
        
        await gameRef.set({
            pin: pin,
            status: 'created',
            currentQuestionIndex: -1,
            questions: questions,
            hostId: currentHostId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentGameRef = gameRef;
        
        sessionStorage.setItem('activeGameSession', JSON.stringify({
            pin: pin,
            isHost: true,
            hostId: currentHostId,
            timestamp: Date.now()
        }));
        
        console.log('✅ Game created with PIN:', pin);
        return { success: true, pin: pin, gameRef: gameRef };
        
    } catch (error) {
        console.error('❌ Firebase error:', error);
        alert('Failed to create game: ' + error.message);
        return { success: false };
    }
}

async function attachGameListeners(gameRef) {
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        
        const data = doc.data();
        console.log('Game update:', data.status, 'Question index:', data.currentQuestionIndex);
        
        const startBtn = document.getElementById('startGameBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const endBtn = document.getElementById('endGameBtn');
        const statusDiv = document.getElementById('gameStatusMessage');
        const currentQDiv = document.getElementById('currentQuestionDisplay');
        
        if (data.status === 'active') {
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.textContent = '✓ ACTIVE';
            }
            if (endBtn) endBtn.disabled = false;
            
            const current = data.currentQuestionIndex;
            const total = data.questions.length;
            
            // Enable next button only if there are more questions AND not waiting for answers
            if (current + 1 < total && !data.waitingForNext) {
                if (nextBtn) nextBtn.disabled = false;
            } else {
                if (nextBtn) nextBtn.disabled = true;
            }
            
            if (current >= 0 && current < total) {
                const q = data.questions[current];
                if (currentQDiv) {
                    currentQDiv.innerHTML = `
                        <strong>Question ${current + 1}/${total}</strong><br>
                        ${escapeHtml(q.text)}<br>
                        <small>Type: ${q.type} | Points: ${q.points}</small>
                    `;
                }
                if (statusDiv) statusDiv.innerHTML = `📢 Question ${current + 1}/${total} is LIVE! Students answering...`;
            } else {
                if (currentQDiv) currentQDiv.innerHTML = 'Ready to start. Click NEXT QUESTION.';
                if (statusDiv) statusDiv.innerHTML = '🚀 Game active! Click NEXT QUESTION to begin.';
                if (nextBtn) nextBtn.disabled = false;
            }
        } else if (data.status === 'created') {
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.textContent = '▶️ START GAME';
            }
            if (nextBtn) nextBtn.disabled = true;
            if (endBtn) endBtn.disabled = true;
            if (currentQDiv) currentQDiv.innerHTML = 'Game created. Click START GAME when ready.';
            if (statusDiv) statusDiv.innerHTML = `📌 Game PIN: ${data.pin} - Share with students!`;
        } else if (data.status === 'ended') {
            if (startBtn) startBtn.disabled = true;
            if (nextBtn) nextBtn.disabled = true;
            if (endBtn) endBtn.disabled = true;
            if (currentQDiv) currentQDiv.innerHTML = '🏆 Game has ended!';
            if (statusDiv) statusDiv.innerHTML = '🏁 Game Over! Thanks for playing.';
        }
    });
    
    const playersRef = gameRef.collection('players');
    unsubPlayers = playersRef.onSnapshot(snapshot => {
        const players = [];
        snapshot.forEach(doc => {
            players.push({ id: doc.id, ...doc.data() });
        });
        players.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        const container = document.getElementById('leaderboardList');
        const countDisplay = document.getElementById('playerCount');
        
        if (players.length === 0) {
            if (container) container.innerHTML = '<div class="leaderboard-entry">No players yet. Share the PIN!</div>';
            if (countDisplay) countDisplay.innerHTML = '👥 0 players joined';
        } else {
            if (container) {
                container.innerHTML = players.map((p, i) => `
                    <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                        <span>${i === 0 ? '👑' : `${i+1}.`} ${escapeHtml(p.name)}</span>
                        <span>⭐ ${p.score || 0}</span>
                    </div>
                `).join('');
            }
            if (countDisplay) countDisplay.innerHTML = `👥 ${players.length} player${players.length !== 1 ? 's' : ''} joined`;
        }
        
        updateAnalytics(players);
    });
}

async function startGame() {
    if (!currentGameRef) {
        alert('No active game found');
        return;
    }
    
    setLoading('Starting game');
    try {
        await currentGameRef.update({ 
            status: 'active', 
            currentQuestionIndex: -1,
            waitingForNext: false
        });
        
        const statusDiv = document.getElementById('gameStatusMessage');
        if (statusDiv) statusDiv.innerHTML = '🚀 Game started! Click NEXT QUESTION to begin.';
        
        const nextBtn = document.getElementById('nextQuestionBtn');
        if (nextBtn) nextBtn.disabled = false;
        
        const endBtn = document.getElementById('endGameBtn');
        if (endBtn) endBtn.disabled = false;
        
        console.log('✅ Game started');
    } catch (error) {
        console.error('❌ Firebase error:', error);
        alert('Failed to start game: ' + error.message);
    }
}

async function nextQuestion() {
    if (!currentGameRef) {
        alert('No active game found');
        return;
    }
    
    setLoading('Loading question');
    
    try {
        const doc = await currentGameRef.get();
        const data = doc.data();
        
        if (data.status !== 'active') {
            alert('Game is not active. Click START GAME first.');
            return;
        }
        
        // Get current index and move to next
        let nextIdx = (data.currentQuestionIndex || -1) + 1;
        
        console.log('Current index:', data.currentQuestionIndex, 'Next index:', nextIdx, 'Total:', data.questions.length);
        
        if (nextIdx >= data.questions.length) {
            await endGame();
            return;
        }
        
        // Clear previous timeout
        if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
        
        // Update current question index in Firebase
        await currentGameRef.update({ 
            currentQuestionIndex: nextIdx,
            waitingForNext: false
        });
        
        // Create active question document in Firebase with 15 second timer
        const activeRef = currentGameRef.collection('activeQuestion').doc('current');
        await activeRef.set({
            question: data.questions[nextIdx],
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
            isActive: true,
            questionIndex: nextIdx
        });
        
        const nextBtn = document.getElementById('nextQuestionBtn');
        if (nextBtn) nextBtn.disabled = true;
        
        const statusDiv = document.getElementById('gameStatusMessage');
        if (statusDiv) statusDiv.innerHTML = `📢 Question ${nextIdx + 1}/${data.questions.length} is LIVE! Waiting for answers...`;
        
        // Auto-close after 15 seconds and enable next button
        currentQuestionTimeout = setTimeout(async () => {
            try {
                const activeDoc = await currentGameRef.collection('activeQuestion').doc('current').get();
                if (activeDoc.exists && activeDoc.data()?.isActive) {
                    await activeRef.update({ isActive: false });
                    await currentGameRef.update({ waitingForNext: true });
                    if (statusDiv) statusDiv.innerHTML = `⏰ Time\'s up for Question ${nextIdx + 1}! Click NEXT to continue.`;
                    if (nextBtn) nextBtn.disabled = false;
                }
            } catch (err) {
                console.error('Timeout error:', err);
            }
        }, 15000);
        
        console.log('✅ Question sent:', nextIdx + 1);
    } catch (error) {
        console.error('❌ Firebase error:', error);
        alert('Failed to send question: ' + error.message);
    }
}

async function endGame() {
    if (!currentGameRef) return;
    
    if (!confirm('End the game? Students will see final results.')) return;
    
    setLoading('Ending game');
    
    if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
    
    try {
        await currentGameRef.update({ status: 'ended' });
        
        const nextBtn = document.getElementById('nextQuestionBtn');
        const startBtn = document.getElementById('startGameBtn');
        const endBtn = document.getElementById('endGameBtn');
        
        if (nextBtn) nextBtn.disabled = true;
        if (startBtn) startBtn.disabled = true;
        if (endBtn) endBtn.disabled = true;
        
        const statusDiv = document.getElementById('gameStatusMessage');
        if (statusDiv) statusDiv.innerHTML = '🏁 Game ended! Students can see their results.';
        
        console.log('✅ Game ended');
    } catch (error) {
        console.error('❌ Firebase error:', error);
        alert('Failed to end game: ' + error.message);
    }
}

function updateAnalytics(players) {
    const container = document.getElementById('analyticsDisplay');
    if (!container) return;
    
    const totalPlayers = players.length;
    const avgScore = totalPlayers ? Math.round(players.reduce((sum, p) => sum + (p.score || 0), 0) / totalPlayers) : 0;
    const topScore = totalPlayers ? Math.max(...players.map(p => p.score || 0)) : 0;
    
    container.innerHTML = `
        <div class="analytics-stat"><strong>Total Players:</strong> ${totalPlayers}</div>
        <div class="analytics-stat"><strong>Average Score:</strong> ${avgScore}</div>
        <div class="analytics-stat"><strong>Highest Score:</strong> ${topScore}</div>
    `;
}

function previewQuestions(questions) {
    if (!questions || questions.length === 0) {
        alert('No questions to preview');
        return;
    }
    
    const modal = document.getElementById('previewModal');
    const content = document.getElementById('previewContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = questions.map((q, i) => `
        <div class="preview-question">
            <h4>Question ${i+1}</h4>
            <p><strong>${escapeHtml(q.text)}</strong></p>
            <p>Type: ${q.type} | Difficulty: ${q.difficulty} | Points: ${q.points}</p>
            <p style="color:#48bb78;"><strong>✓ Answer:</strong> ${getCorrectAnswerText(q)}</p>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('previewModal');
    if (modal) modal.classList.add('hidden');
}

function clearGameSession() {
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    if (activeQuestionListener) activeQuestionListener();
    if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
    
    currentGameRef = null;
    currentGamePin = null;
    currentHostId = null;
    currentQuestionIndex = -1;
    
    sessionStorage.removeItem('activeGameSession');
}