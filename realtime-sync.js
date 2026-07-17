// ==================== REAL-TIME SYNC MODULE ====================
// Ensures immediate teacher-to-student question synchronization

let syncBuffer = {
    lastUpdate: 0,
    pending: false
};

async function nextQuestionWithSync() {
    if (!currentGameRef) return;
    
    // Show loading with proper animation
    setLoading(true, '🔄 Sending question to students...');
    
    try {
        const doc = await currentGameRef.get();
        const data = doc.data();

        if (data.status !== 'active') {
            showToast('Game is not active. Click START first.', 'error');
            setLoading(false);
            return;
        }

        let nextIdx = (data.currentIndex || -1) + 1;

        if (nextIdx >= data.questions.length) {
            // Game is ending
            await currentGameRef.update({ 
                status: 'ended',
                endedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Quiz completed! 🎉', 'success');
            setLoading(false);
            return;
        }

        // IMPORTANT: Clear previous timer FIRST
        if (questionTimerInterval) {
            clearTimeout(questionTimerInterval);
            questionTimerInterval = null;
        }

        // Step 1: Update currentIndex (teacher sees this)
        await currentGameRef.update({
            currentIndex: nextIdx,
            waitingForNext: false,
            questionSentAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Step 2: Create/update activeQuestion document with sync flag
        const activeRef = currentGameRef.collection('activeQuestion').doc('current');
        const questionData = data.questions[nextIdx];
        const startTime = new Date();
        const expiresAt = new Date(startTime.getTime() + 15000);

        await activeRef.set({
            question: questionData,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
            isActive: true,
            index: nextIdx,
            syncFlag: Math.random(), // Force listener update
            sentToStudents: true
        });

        // Step 3: Update teacher UI
        currentQuestionIndex = nextIdx;
        const total = data.questions.length;
        const nextBtn = document.getElementById('nextControl');
        const statusDiv = document.getElementById('statusMsg');

        if (nextBtn) nextBtn.disabled = true;
        if (statusDiv) {
            statusDiv.innerHTML = `📢 Question ${nextIdx+1}/${total} is LIVE! Waiting for answers...`;
        }

        // Step 4: Display current question info on dashboard
        const currentQDiv = document.getElementById('currentQDisplay');
        if (currentQDiv) {
            currentQDiv.innerHTML = `
                <div style="margin-bottom: 8px;"><strong style="color: #ffd89b;">Question ${nextIdx+1}/${total}</strong></div>
                <div style="font-size: 1.1rem; margin-bottom: 8px;">${escapeHtml(questionData.text)}</div>
                <div style="color: var(--text-secondary); font-size: 0.9rem;">
                    <span style="background: rgba(102,126,234,0.2); padding: 2px 10px; border-radius: 12px; border: 1px solid rgba(102,126,234,0.3);">${questionData.type.toUpperCase()}</span>
                    <span style="margin-left: 10px;">🎯 ${questionData.points} pts | ${questionData.difficulty}</span>
                </div>
            `;
        }

        // Step 5: Set up auto-enable after 15 seconds
        questionTimerInterval = setTimeout(async () => {
            try {
                const activeDoc = await currentGameRef.collection('activeQuestion').doc('current').get();
                if (activeDoc.exists && activeDoc.data()?.isActive) {
                    await activeRef.update({ 
                        isActive: false,
                        stoppedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await currentGameRef.update({ waitingForNext: true });

                    if (statusDiv) {
                        statusDiv.innerHTML = `⏰ Time's up for Question ${nextIdx+1}! Click NEXT to continue.`;
                    }
                    if (nextBtn) {
                        const gameDoc = await currentGameRef.get();
                        const gameData = gameDoc.data();
                        const hasMore = nextIdx + 1 < gameData.questions.length;
                        nextBtn.disabled = !hasMore;
                    }
                }
            } catch (e) { 
                console.error('Timer error:', e); 
            }
        }, 15000);

        // Update sync buffer
        syncBuffer.lastUpdate = Date.now();
        syncBuffer.pending = false;

        // Success feedback
        showToast(`✅ Question ${nextIdx+1} sent to all students!`, 'success');
        setLoading(false);

    } catch (err) {
        showToast('❌ Error: ' + err.message, 'error');
        console.error('Sync error:', err);
        syncBuffer.pending = false;
    } finally {
        setLoading(false);
    }
}

// Enhanced student question listener with sync detection
function listenToQuestionWithSync() {
    if (!currentGameRef) return;
    
    unsubQuestion = currentGameRef.collection('activeQuestion').doc('current').onSnapshot((snap) => {
        console.log('📡 Question sync received:', snap.exists ? 'YES' : 'NO');
        
        const qd = document.getElementById('questionDisplay');
        const fb = document.getElementById('feedback');
        const timerDiv = document.getElementById('timer');

        if (!snap.exists) {
            if (qd) qd.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px;">⏳ Waiting for question...</div>';
            if (timerDiv) timerDiv.innerText = '15';
            if (fb) fb.innerHTML = '';
            return;
        }

        const questionData = snap.data();

        // Check if question is still active
        if (!questionData.isActive) {
            if (qd) qd.innerHTML = '<div class="text-center" style="color: var(--text-secondary); padding: 40px;">⏳ Getting next question ready...</div>';
            if (timerDiv) timerDiv.innerText = '15';
            if (fb) fb.innerHTML = '';
            return;
        }

        // SYNC POINT: Question received immediately
        canAnswer = true;
        hasAnsweredCurrent = false;

        const question = questionData.question;
        const expiry = questionData.expiresAt.toDate();
        const qIdx = questionData.index;

        console.log('✅ Rendering question for student:', question.text);

        // Clear feedback
        if (fb) fb.innerHTML = '';
        if (timerDiv) {
            timerDiv.innerText = '15';
            timerDiv.classList.remove('timer-warning');
        }

        // Render question
        renderStudentQuestion(question);
        startStudentTimer(expiry);

        // Attach answer listener
        attachAnswerListener(question, async (answer) => {
            console.log('📝 Student answer:', answer);
            if (canAnswer && !hasAnsweredCurrent) {
                hasAnsweredCurrent = true;
                canAnswer = false;
                await submitAnswer(answer, question, qIdx, expiry);
            }
        });

    }, (error) => {
        console.error('Question listener error:', error);
    });
}

// Retry mechanism for sync failures
async function retrySyncQuestion(retries = 3, delay = 500) {
    for (let i = 0; i < retries; i++) {
        try {
            const doc = await currentGameRef.collection('activeQuestion').doc('current').get();
            if (doc.exists && doc.data().isActive) {
                console.log(`✅ Sync recovered on attempt ${i + 1}`);
                return true;
            }
        } catch (err) {
            console.warn(`Retry ${i + 1} failed:`, err);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    console.error('Sync recovery failed after retries');
    return false;
}

console.log('✅ Real-time sync module loaded');
