// ==================== GAME HOST MODULE ====================

async function createGame() {
    if (!myQuestions.length) { showToast('Add questions first!', 'error'); return; }

    setLoading(true, 'Creating game...');

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    currentPin = pin;
    currentQuestionIndex = -1;
    totalQuestionsCount = myQuestions.length;

    try {
        const user = await auth.signInAnonymously();
        const gameRef = db.collection('games').doc(pin);

        await gameRef.set({
            pin: pin,
            status: 'waiting',
            currentIndex: -1,
            questions: myQuestions,
            hostId: user.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            waitingForNext: false
        });

        currentGameRef = gameRef;
        isGameHost = true;
        saveSession(pin, true);

        hide('hostPanel');
        show('gameDashboard');
        document.getElementById('gamePin').innerText = pin;
        document.getElementById('statusMsg').innerHTML = `✅ Game created! PIN: <strong style="color: #ffd89b;">${pin}</strong> — Share with students. Click START when ready.`;

        // Listen to game document
        unsubGame = gameRef.onSnapshot((doc) => {
            if (!doc.exists) return;
            const data = doc.data();
            const startBtn = document.getElementById('startGameControl');
            const nextBtn = document.getElementById('nextControl');
            const endBtn = document.getElementById('endControl');
            const currentQDiv = document.getElementById('currentQDisplay');
            const statusDiv = document.getElementById('statusMsg');

            if (data.status === 'active') {
                if (startBtn) { startBtn.disabled = true; startBtn.textContent = '✓ ACTIVE'; }
                if (endBtn) endBtn.disabled = false;

                const idx = data.currentIndex;
                const total = data.questions.length;

                // Enable NEXT when waitingForNext is true OR when game just started (idx === -1)
                const canGoNext = data.waitingForNext || idx === -1;
                const hasMoreQuestions = idx + 1 < total;

                if (nextBtn) {
                    nextBtn.disabled = !(canGoNext && hasMoreQuestions);
                }

                if (idx >= 0 && idx < total) {
                    const q = data.questions[idx];
                    if (currentQDiv) {
                        currentQDiv.innerHTML = `
                            <div style="margin-bottom: 8px;"><strong style="color: #ffd89b;">Question ${idx+1}/${total}</strong></div>
                            <div style="font-size: 1.1rem; margin-bottom: 8px;">${escapeHtml(q.text)}</div>
                            <div style="color: var(--text-secondary); font-size: 0.9rem;">
                                <span style="background: rgba(102,126,234,0.2); padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(102,126,234,0.3);">${q.type.toUpperCase()}</span>
                                <span style="margin-left: 10px;">🎯 ${q.points} pts | ${q.difficulty}</span>
                            </div>
                        `;
                    }
                    if (statusDiv) {
                        if (data.waitingForNext) {
                            statusDiv.innerHTML = `⏰ Time's up for Question ${idx+1}! Click NEXT to continue.`;
                        } else {
                            statusDiv.innerHTML = `📢 Question ${idx+1}/${total} is LIVE! Students are answering...`;
                        }
                    }
                } else {
                    if (currentQDiv) currentQDiv.innerHTML = '<span style="color: var(--text-secondary);">Ready to start. Click NEXT QUESTION to begin.</span>';
                    if (statusDiv) statusDiv.innerHTML = '🚀 Game active! Click NEXT QUESTION to begin.';
                    if (nextBtn) nextBtn.disabled = false;
                }
            } else if (data.status === 'waiting') {
                if (startBtn) { startBtn.disabled = false; startBtn.textContent = '▶ START'; }
                if (nextBtn) nextBtn.disabled = true;
                if (endBtn) endBtn.disabled = true;
                if (currentQDiv) currentQDiv.innerHTML = '<span style="color: var(--text-secondary);">Game created. Click START GAME when ready.</span>';
                if (statusDiv) statusDiv.innerHTML = `📌 PIN: <strong style="color: #ffd89b;">${pin}</strong> — Share with students. Click START when ready.`;
            } else if (data.status === 'ended') {
                if (startBtn) { startBtn.disabled = true; startBtn.textContent = 'ENDED'; }
                if (nextBtn) nextBtn.disabled = true;
                if (endBtn) endBtn.disabled = true;
                if (currentQDiv) currentQDiv.innerHTML = '<span style="color: #ffd89b; font-weight: 700;">🏆 Game has ended!</span>';
                if (statusDiv) statusDiv.innerHTML = '🏁 Game Over! Thanks for playing.';
            }
        });

        // Listen to players
        unsubPlayers = gameRef.collection('players').onSnapshot((snap) => {
            const players = [];
            snap.forEach(doc => players.push({ id: doc.id, ...doc.data() }));
            players.sort((a, b) => (b.score || 0) - (a.score || 0));

            const container = document.getElementById('leaderboard');
            const countDiv = document.getElementById('playerCount');

            if (!players.length) {
                if (container) container.innerHTML = '<div class="leaderboard-entry" style="color: var(--text-secondary);">No players yet. Share the PIN!</div>';
                if (countDiv) countDiv.innerHTML = '👥 0 players joined';
            } else {
                if (container) {
                    container.innerHTML = players.map((p, i) => `
                        <div class="leaderboard-entry ${i === 0 ? 'top1' : ''}">
                            <span>${i === 0 ? '👑' : i+1}. ${escapeHtml(p.name)}</span>
                            <span>⭐ ${p.score || 0}</span>
                        </div>
                    `).join('');
                }
                if (countDiv) countDiv.innerHTML = `👥 ${players.length} player${players.length !== 1 ? 's' : ''} joined`;
            }

            const total = players.reduce((s, p) => s + (p.score || 0), 0);
            const avg = players.length ? Math.round(total / players.length) : 0;
            const top = players.length ? players[0].score || 0 : 0;

            document.getElementById('statTotal').innerText = players.length;
            document.getElementById('statAvg').innerText = avg;
            document.getElementById('statTop').innerText = top;
        });

        showToast(`Game created! PIN: ${pin}`, 'success');

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
        console.error(err);
    } finally {
        setLoading(false);
    }
}

async function startGame() {
    if (!currentGameRef) return;
    setLoading(true, 'Starting game...');
    try {
        await currentGameRef.update({ status: 'active', currentIndex: -1, waitingForNext: false });
        showToast('Game started!', 'success');
    } catch (err) {
        showToast('Failed to start: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}

async function nextQuestion() {
    if (!currentGameRef) return;
    setLoading(true, 'Loading next question...');

    try {
        const doc = await currentGameRef.get();
        const data = doc.data();

        if (data.status !== 'active') {
            showToast('Game is not active. Click START first.', 'error');
            setLoading(false);
            return;
        }

        const currentIndex = typeof data.currentIndex === 'number' ? data.currentIndex : -1;
        const nextIdx = currentIndex + 1;

        if (nextIdx >= data.questions.length) {
            await currentGameRef.update({ status: 'ended' });
            showToast('Quiz completed! 🎉', 'success');
            setLoading(false);
            return;
        }

        // Clear previous timer
        if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);

        // Update game with new question index
        await currentGameRef.update({
            currentIndex: nextIdx,
            waitingForNext: false
        });

        // Create active question document
        const activeRef = currentGameRef.collection('activeQuestion').doc('current');
        await activeRef.set({
            question: data.questions[nextIdx],
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 15000)),
            isActive: true,
            index: nextIdx
        });

        currentQuestionIndex = nextIdx;
        const total = data.questions.length;

        // Disable NEXT until time's up
        const nextBtn = document.getElementById('nextControl');
        const statusDiv = document.getElementById('statusMsg');

        if (nextBtn) nextBtn.disabled = true;
        if (statusDiv) statusDiv.innerHTML = `📢 Question ${nextIdx+1}/${total} is LIVE! Waiting for answers...`;

        // Auto-enable NEXT after 15 seconds
        currentQuestionTimeout = setTimeout(async () => {
            try {
                const activeDoc = await currentGameRef.collection('activeQuestion').doc('current').get();
                if (activeDoc.exists && activeDoc.data()?.isActive) {
                    await activeRef.update({ isActive: false });
                    await currentGameRef.update({ waitingForNext: true });

                    if (statusDiv) statusDiv.innerHTML = `⏰ Time's up for Question ${nextIdx+1}! Click NEXT to continue.`;
                    if (nextBtn) {
                        // Check if there are more questions
                        const gameDoc = await currentGameRef.get();
                        const gameData = gameDoc.data();
                        const hasMore = nextIdx + 1 < gameData.questions.length;
                        nextBtn.disabled = !hasMore;
                    }
                }
            } catch (e) { console.error('Timer error:', e); }
        }, 15000);

        showToast(`Question ${nextIdx+1} sent!`, 'success');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
        console.error(err);
    } finally {
        setLoading(false);
    }
}

async function endGame() {
    if (!currentGameRef) return;
    if (!confirm('End the game? Students will see final results.')) return;

    setLoading(true, 'Ending game...');
    if (currentQuestionTimeout) clearTimeout(currentQuestionTimeout);

    try {
        await currentGameRef.update({ status: 'ended' });
        showToast('Game ended!', 'info');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
}
