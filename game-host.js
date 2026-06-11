// ==================== GAME HOST FUNCTIONS ====================

async function createGameAndHost() {
    if (!currentQuestions.length) {
        alert('Please add some questions first!');
        return;
    }
    
    setLoading('Creating game');
    
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentGamePin = pin;
    
    try {
        const user = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);
        
        await gameRef.set({
            pin: pin,
            status: 'created',
            currentQuestionIndex: -1,
            questions: currentQuestions,
            hostId: user.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentGameRef = gameRef;
        
        // Switch to active game dashboard
        document.getElementById('teacherDashboard').classList.add('hidden');
        document.getElementById('activeGameDashboard').classList.remove('hidden');
        document.getElementById('gamePinDisplay').innerText = pin;
        document.getElementById('gameStatusMessage').innerHTML = '📌 Game created! Share this PIN with students. Click START GAME when ready.';
        
        attachGameListeners(gameRef);
        
        console.log('Game created with PIN:', pin);
    } catch (error) {
        console.error(error);
        alert('Failed to create game: ' + error.message);
    }
}

async function attachGameListeners(gameRef) {
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    
    // Listen to game state
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        
        const startBtn = document.getElementById('startGameBtn');
        const nextBtn = document.getElementById('nextQuestionBtn');
        const endBtn = document.getElementById('endGameBtn');
        const statusDiv = document.getElementById('gameStatusMessage');
        const currentQDiv = document.getElementById('currentQuestionDisplay');
        
        if (data.status === 'active') {
            startBtn.disabled = true;
            startBtn.textContent = '✓ GAME ACTIVE';
            endBtn.disabled = false;
            
            const total = data.questions.length;
            const current = data.currentQuestionIndex;
            
            if (current + 1 < total) {
                nextBtn.disabled = false;
            } else {
                nextBtn.disabled = true;
            }
            
            if (current >= 0 && current < total) {
                const q = data.questions[current];
                currentQDiv.innerHTML = `<strong>Question ${current + 1}/${total}</strong><br>${escapeHtml(q.text)}<br><small>Type: ${q.type} | Points: ${q.points}</small>`;
                statusDiv.innerHTML = `📢 Question ${current + 1}/${total} is LIVE! Students are answering...`;
            } else {
                currentQDiv.innerHTML = 'Press NEXT QUESTION to start';
                statusDiv.innerHTML = '🚀 Game is active! Press NEXT QUESTION to begin.';
            }
        } else if (data.status === 'created') {
            startBtn.disabled = false;
            startBtn.textContent = '▶️ START GAME';
            nextBtn.disabled = true;
            endBtn.disabled = true;
            currentQDiv.innerHTML = 'Game created. Click START GAME when all students have joined.';
            statusDiv.innerHTML = `📌 Game PIN: ${data.pin} - Share with students!`;
        } else if (data.status === 'ended') {
            startBtn.disabled = true;
            nextBtn.disabled = true;
            endBtn.disabled = true;
            currentQDiv.innerHTML = '🏆 Game has ended!';
            statusDiv.innerHTML = '🏁 Game Over! Thanks for playing.';
        }
    });
    
    // Listen to players
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
            container.innerHTML = '<div class="leaderboard-entry">No players yet. Share the PIN!</div>';
            countDisplay.innerHTML = '👥 0 players joined';
        } else {
            container.innerHTML = players.map((p, i) => `
                <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                    <span>${i === 0 ? '👑' : `${i+1}.`} ${escapeHtml(p.name)}</span>
                    <span>⭐ ${p.score || 0}</span>
                </div>
            `).join('');
            countDisplay.innerHTML = `👥 ${players.length} player${players.length !== 1 ? 's' : ''} joined`;
        }
        
        // Update analytics
        updateAnalytics(players);
    });
}

function updateAnalytics(players) {
    const container = document.getElementById('analyticsDisplay');
    const totalPlayers = players.length;
    const avgScore = players.length ? Math.round(players.reduce((sum, p) => sum + (p.score || 0), 0) / players.length) : 0;
    const topScore = players.length ? Math.max(...players.map(p => p.score || 0)) : 0;
    
    container.innerHTML = `
        <div class="analytics-stat"><strong>Total Players:</strong> <span>${totalPlayers}</span></div>
        <div class="analytics-stat"><strong>Average Score:</strong> <span>${avgScore}</span></div>
        <div class="analytics-stat"><strong>Highest Score:</strong> <span>${topScore}</span></div>
    `;
}

async function startGame() {
    if (!currentGameRef) return;
    
    setLoading('Starting game');
    try {
        await currentGameRef.update({ status: 'active', currentQuestionIndex: -1 });
        document.getElementById('gameStatusMessage').innerHTML = '🚀 Game started! Click NEXT QUESTION to send first question.';
        document.getElementById('nextQuestionBtn').disabled = false;
        document.getElementById('endGameBtn').disabled = false;
    } catch (error) {
        alert('Failed to start: ' + error.message);
    }
}

async function nextQuestion() {
    if (!currentGameRef) return;
    
    setLoading('Sending question');
    
    try {
        const doc = await currentGameRef.get();
        const data = doc.data();
        
        if (data.status !== 'active') {
            alert('Game is not active. Click START GAME first.');
            return;
        }
        
        let nextIdx = (data.currentQuestionIndex || -1) + 1;
        
        if (nextIdx >= data.questions.length) {
            await endGame();
            return;
        }
        
        if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
        
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
        document.getElementById('gameStatusMessage').innerHTML = `📢 Question ${nextIdx + 1}/${data.questions.length} is LIVE! Waiting for answers...`;
        
        currentQuestionTimeout = setTimeout(async () => {
            const active = await currentGameRef.collection('activeQuestion').doc('current').get();
            if (active.exists && active.data()?.isActive) {
                await activeRef.update({ isActive: false });
                document.getElementById('gameStatusMessage').innerHTML = `⏰ Time\'s up for Question ${nextIdx + 1}! Click NEXT to continue.`;
                document.getElementById('nextQuestionBtn').disabled = false;
            }
        }, 15000);
        
    } catch (error) {
        console.error(error);
        alert('Failed: ' + error.message);
    }
}

async function endGame() {
    if (!confirm('End the game? Students will see final results.')) return;
    
    setLoading('Ending game');
    if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);
    
    try {
        await currentGameRef.update({ status: 'ended' });
        document.getElementById('nextQuestionBtn').disabled = true;
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('endGameBtn').disabled = true;
        document.getElementById('gameStatusMessage').innerHTML = '🏁 Game ended! Students can see their results.';
    } catch (error) {
        alert('Failed: ' + error.message);
    }
}

async function previewGameQuestions() {
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

function closeModal() {
    document.getElementById('previewModal').classList.add('hidden');
}