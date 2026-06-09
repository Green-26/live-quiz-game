// ==================== HOST FUNCTIONS ====================
let currentQuestionTimeout = null;

function generatePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hostNewGame() {
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
        
        if (data.status === 'active') {
            const total = data.questions.length;
            const curr = data.currentQuestionIndex;
            
            if (curr + 1 < total) {
                document.getElementById('nextQuestionBtn').disabled = false;
            } else {
                document.getElementById('nextQuestionBtn').disabled = true;
            }
            document.getElementById('startGameBtn').disabled = true;
            document.getElementById('endGameBtn').classList.remove('hidden');
            
            if (curr >= 0 && curr < total) {
                document.getElementById('hostGameStatus').innerHTML = `📢 Question ${curr + 1}/${total} is LIVE! Waiting for answers...`;
            } else {
                document.getElementById('hostGameStatus').innerHTML = '🚀 Game started! Press "Next Question" to begin.';
            }
        } else if (data.status === 'lobby') {
            document.getElementById('startGameBtn').disabled = false;
            document.getElementById('nextQuestionBtn').disabled = true;
            document.getElementById('endGameBtn').classList.add('hidden');
            document.getElementById('hostGameStatus').innerHTML = '📌 Game in lobby mode. Add questions and press Start!';
        } else if (data.status === 'ended') {
            document.getElementById('nextQuestionBtn').disabled = true;
            document.getElementById('startGameBtn').disabled = true;
            document.getElementById('hostGameStatus').innerHTML = '🏁 Game Over! Great job everyone!';
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
            <div style="background: #f7fafc; padding: 10px; margin: 8px 0; border-radius: 8px;">
                <span class="question-type-badge type-${typeClass}">${q.type.replace('_', ' ')}</span>
                <strong>Q${idx + 1}:</strong> ${escapeHtml(q.text.substring(0, 60))}${q.text.length > 60 ? '...' : ''}
                <span style="float: right;">🎯 ${q.points} pts | 📚 ${q.subject}</span>
            </div>
        `;
    }).join('');
}

async function addQuestion() {
    if (!currentUser?.isHost) {
        alert('You must be a host to add questions');
        return;
    }
    
    const question = buildQuestionFromForm();
    if (!question) return;
    
    try {
        const gameDoc = await currentGameRef.get();
        const questions = gameDoc.data()?.questions || [];
        
        await currentGameRef.update({
            questions: [...questions, question]
        });
        
        // Clear form
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

async function startGame() {
    try {
        const snap = await currentGameRef.get();
        const questions = snap.data()?.questions;
        
        if (!questions || questions.length === 0) {
            alert('Please add at least one question first!');
            return;
        }
        
        await currentGameRef.update({ status: 'active', currentQuestionIndex: -1 });
        document.getElementById('hostGameStatus').innerHTML = '🚀 Game started! Press "Next Question" to begin.';
    } catch (error) {
        console.error('Error starting game:', error);
        alert('Failed to start game. Please try again.');
    }
}

async function nextQuestion() {
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
        
        // Clear any existing timeout
        if (currentQuestionTimeout) {
            clearTimeout(currentQuestionTimeout);
        }
        
        // Update current question index
        await currentGameRef.update({ currentQuestionIndex: nextIdx });
        
        // Create active question with 15-second timer
        const activeQRef = currentGameRef.collection('activeQuestion').doc('current');
        await activeQRef.set({
            question: questions[nextIdx],
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
            isActive: true,
            questionIndex: nextIdx
        });
        
        // Disable next button during question
        document.getElementById('nextQuestionBtn').disabled = true;
        document.getElementById('hostGameStatus').innerHTML = `📢 Question ${nextIdx + 1}/${questions.length} is LIVE! Waiting for answers...`;
        
        // Auto-close after 15 seconds and enable next button
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
        if (currentQuestionTimeout) {
            clearTimeout(currentQuestionTimeout);
        }
        await currentGameRef.update({ status: 'ended' });
        document.getElementById('hostGameStatus').innerHTML = '🏁 Game ended by host.';
        document.getElementById('nextQuestionBtn').disabled = true;
    }
}