// ==================== PLAYER FUNCTIONS ====================
let hasAnsweredCurrentQuestion = false; // Track if player already answered

async function joinGame() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const gamePin = document.getElementById('gamePinInput').value.trim();
    
    if (!playerName || !gamePin) {
        document.getElementById('authError').innerText = 'Please enter name and game PIN';
        return;
    }
    
    try {
        const gameRef = db.collection('games').doc(gamePin);
        const gameDoc = await gameRef.get();
        
        if (!gameDoc.exists) {
            document.getElementById('authError').innerText = 'Game not found! Check the PIN.';
            return;
        }
        
        const userCredential = await auth.signInAnonymously();
        const playerId = userCredential.user.uid;
        
        const playerRef = gameRef.collection('players').doc(playerId);
        
        await playerRef.set({
            name: playerName,
            score: 0,
            joinedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        currentUser = { 
            uid: playerId, 
            isHost: false, 
            gameId: gamePin, 
            playerName: playerName 
        };
        sessionStorage.setItem('quizUser', JSON.stringify(currentUser));
        switchToPlayer(gamePin, playerName);
        attachPlayerListeners(gameRef, playerId);
        
    } catch (error) {
        console.error('Error joining game:', error);
        document.getElementById('authError').innerText = 'Failed to join game. ' + error.message;
    }
}

async function attachPlayerListeners(gameRef, playerId) {
    if (unsubGame) unsubGame();
    if (activeQuestionListener) activeQuestionListener();
    
    // Listen to game status
    unsubGame = gameRef.onSnapshot(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        
        if (data.status === 'lobby') {
            document.getElementById('waitingArea').classList.remove('hidden');
            document.getElementById('quizArea').classList.add('hidden');
            hasAnsweredCurrentQuestion = false;
        } else if (data.status === 'active') {
            document.getElementById('waitingArea').classList.add('hidden');
            document.getElementById('quizArea').classList.remove('hidden');
        } else if (data.status === 'ended') {
            document.getElementById('quizArea').classList.add('hidden');
            showGameResults(gameRef, playerId);
        }
    });
    
    // Listen to active question
    const activeQRef = gameRef.collection('activeQuestion').doc('current');
    activeQuestionListener = activeQRef.onSnapshot(async (snap) => {
        if (!snap.exists) {
            document.getElementById('questionDisplay').innerHTML = '<div class="text-center">⏳ Getting next question ready...</div>';
            return;
        }
        
        const qData = snap.data();
        
        if (!qData.isActive) {
            document.getElementById('questionDisplay').innerHTML = '<div class="text-center">⏳ Waiting for next question...</div>';
            return;
        }
        
        // Reset answer tracking for new question
        hasAnsweredCurrentQuestion = false;
        
        const question = qData.question;
        const expiresAt = qData.expiresAt.toDate();
        const questionIndex = qData.questionIndex;
        
        // Reset feedback for new question
        document.getElementById('answerFeedback').innerHTML = '';
        
        renderPlayerQuestion(question, expiresAt, async (answer) => {
            // Prevent multiple answers to same question
            if (hasAnsweredCurrentQuestion) {
                document.getElementById('answerFeedback').innerHTML = '<p style="color: #ed8936;">⚠️ You already answered this question!</p>';
                return;
            }
            hasAnsweredCurrentQuestion = true;
            await submitAnswer(gameRef, playerId, answer, question, questionIndex, expiresAt);
        });
        
        // Timer countdown
        startTimer(expiresAt);
    });
    
    // Listen to score updates
    const playerScoreRef = gameRef.collection('players').doc(playerId);
    if (unsubPlayers) unsubPlayers();
    unsubPlayers = playerScoreRef.onSnapshot(doc => {
        if (doc.exists) {
            const score = doc.data()?.score || 0;
            document.getElementById('playerScore').innerText = score;
        }
    });
}

// New function to show game results
async function showGameResults(gameRef, playerId) {
    try {
        // Get all players
        const playersSnapshot = await gameRef.collection('players').orderBy('score', 'desc').get();
        const players = [];
        let playerRank = 0;
        let playerScore = 0;
        
        playersSnapshot.forEach((doc, index) => {
            const playerData = doc.data();
            players.push({
                name: playerData.name,
                score: playerData.score || 0
            });
            if (doc.id === playerId) {
                playerRank = index + 1;
                playerScore = playerData.score || 0;
            }
        });
        
        // Get total questions
        const gameDoc = await gameRef.get();
        const totalQuestions = gameDoc.data()?.questions.length || 0;
        
        // Create results HTML
        let resultsHtml = `
            <div style="text-align: center;">
                <div style="font-size: 3rem;">🏆</div>
                <h2>Game Over!</h2>
                <div style="font-size: 1.5rem; margin: 20px 0;">
                    Your Score: <strong>${playerScore}</strong> / ${totalQuestions * 100}
                </div>
                <div style="font-size: 1.2rem; margin: 10px 0;">
                    Your Position: <strong>#${playerRank}</strong> of ${players.length}
                </div>
                <hr style="margin: 20px 0;">
                <h3>Final Leaderboard</h3>
                <div class="leaderboard" style="max-height: 300px; overflow-y: auto;">
                    ${players.map((p, idx) => `
                        <div class="leaderboard-entry ${idx === 0 ? 'top-1' : ''}" style="${idx + 1 === playerRank ? 'background: #c6f6d5; font-weight: bold;' : ''}">
                            <span>${idx === 0 ? '👑' : `${idx + 1}.`} ${escapeHtml(p.name)}</span>
                            <span>⭐ ${p.score} pts</span>
                        </div>
                    `).join('')}
                </div>
                <button id="playAgainBtn" class="btn btn-primary mt-20" style="margin-top: 20px;">🔄 Play Again</button>
            </div>
        `;
        
        document.getElementById('quizArea').classList.add('hidden');
        document.getElementById('waitingArea').classList.add('hidden');
        
        const playerPanel = document.getElementById('playerPanel');
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'card';
        resultsDiv.id = 'gameResults';
        resultsDiv.innerHTML = resultsHtml;
        
        // Remove old results if exists
        const oldResults = document.getElementById('gameResults');
        if (oldResults) oldResults.remove();
        
        playerPanel.appendChild(resultsDiv);
        
        // Add play again button handler
        document.getElementById('playAgainBtn')?.addEventListener('click', () => {
            window.location.reload();
        });
        
    } catch (error) {
        console.error('Error showing results:', error);
    }
}

function renderPlayerQuestion(question, expiresAt, onAnswerCallback) {
    const displayDiv = document.getElementById('questionDisplay');
    const renderer = QuestionRenderers[question.type];
    
    if (!renderer) {
        displayDiv.innerHTML = '<p>Unsupported question type</p>';
        return;
    }
    
    displayDiv.innerHTML = renderer(question, onAnswerCallback);
    
    // Attach event listeners after rendering
    setTimeout(() => {
        attachQuestionEventListeners(question, onAnswerCallback);
    }, 100);
}

function attachQuestionEventListeners(question, onAnswerCallback) {
    switch(question.type) {
        case 'multiple_choice':
            document.querySelectorAll('.option').forEach(opt => {
                opt.removeEventListener('click', handleMCClick);
                opt.addEventListener('click', handleMCClick);
                function handleMCClick() {
                    if (hasAnsweredCurrentQuestion) return;
                    const answer = parseInt(opt.dataset.optIndex);
                    onAnswerCallback(answer);
                }
            });
            break;
            
        case 'true_false':
            document.querySelectorAll('.tf-option').forEach(opt => {
                opt.removeEventListener('click', handleTFClick);
                opt.addEventListener('click', handleTFClick);
                function handleTFClick() {
                    if (hasAnsweredCurrentQuestion) return;
                    const answer = opt.dataset.value === 'true';
                    onAnswerCallback(answer);
                }
            });
            break;
            
        case 'fill_blank':
            const submitBtn = document.getElementById('submitBlankBtn');
            if (submitBtn) {
                submitBtn.removeEventListener('click', handleBlankSubmit);
                submitBtn.addEventListener('click', handleBlankSubmit);
                function handleBlankSubmit() {
                    if (hasAnsweredCurrentQuestion) return;
                    const answer = document.getElementById('blankAnswer').value;
                    if (!answer.trim()) {
                        document.getElementById('answerFeedback').innerHTML = '<p style="color: #ed8936;">⚠️ Please enter an answer!</p>';
                        return;
                    }
                    onAnswerCallback(answer);
                }
            }
            // Allow Enter key
            const blankInput = document.getElementById('blankAnswer');
            if (blankInput) {
                blankInput.removeEventListener('keypress', handleBlankKeypress);
                blankInput.addEventListener('keypress', handleBlankKeypress);
                function handleBlankKeypress(e) {
                    if (e.key === 'Enter' && !hasAnsweredCurrentQuestion) {
                        const answer = blankInput.value;
                        if (answer.trim()) onAnswerCallback(answer);
                    }
                }
            }
            break;
            
        case 'matching':
            let selectedLeft = null;
            let matches = {};
            
            document.querySelectorAll('.matching-left .matching-item').forEach(item => {
                item.removeEventListener('click', handleLeftClick);
                item.addEventListener('click', handleLeftClick);
                function handleLeftClick() {
                    if (hasAnsweredCurrentQuestion) return;
                    document.querySelectorAll('.matching-item').forEach(i => i.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedLeft = parseInt(item.dataset.leftIdx);
                }
            });
            
            document.querySelectorAll('.matching-right .matching-item').forEach(item => {
                item.removeEventListener('click', handleRightClick);
                item.addEventListener('click', handleRightClick);
                function handleRightClick() {
                    if (hasAnsweredCurrentQuestion) return;
                    if (selectedLeft !== null) {
                        const rightIdx = parseInt(item.dataset.rightIdx);
                        matches[selectedLeft] = rightIdx;
                        const statusDiv = document.getElementById('matchingStatus');
                        if (statusDiv) {
                            statusDiv.innerHTML = `<div class="matching-pair">✓ Matched: ${selectedLeft + 1} → ${rightIdx + 1}</div>`;
                        }
                        selectedLeft = null;
                        document.querySelectorAll('.matching-item').forEach(i => i.classList.remove('selected'));
                    }
                }
            });
            
            const matchingSubmitBtn = document.getElementById('submitMatchingBtn');
            if (matchingSubmitBtn) {
                matchingSubmitBtn.removeEventListener('click', handleMatchingSubmit);
                matchingSubmitBtn.addEventListener('click', handleMatchingSubmit);
                function handleMatchingSubmit() {
                    if (hasAnsweredCurrentQuestion) return;
                    const answer = Object.values(matches);
                    if (answer.length !== question.leftItems.length) {
                        document.getElementById('answerFeedback').innerHTML = '<p style="color: #ed8936;">⚠️ Please match all items!</p>';
                        return;
                    }
                    onAnswerCallback(answer);
                }
            }
            break;
            
        case 'ordering':
            const list = document.getElementById('orderingList');
            if (list) {
                let draggedItem = null;
                
                const items = Array.from(list.children);
                items.forEach(item => {
                    item.setAttribute('draggable', 'true');
                    item.removeEventListener('dragstart', handleDragStart);
                    item.addEventListener('dragstart', handleDragStart);
                    function handleDragStart(e) {
                        if (hasAnsweredCurrentQuestion) {
                            e.preventDefault();
                            return false;
                        }
                        draggedItem = item;
                        e.dataTransfer.effectAllowed = 'move';
                    }
                    item.removeEventListener('dragover', handleDragOver);
                    item.addEventListener('dragover', handleDragOver);
                    function handleDragOver(e) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }
                    item.removeEventListener('drop', handleDrop);
                    item.addEventListener('drop', handleDrop);
                    function handleDrop(e) {
                        e.preventDefault();
                        if (draggedItem !== item && !hasAnsweredCurrentQuestion) {
                            const parent = list;
                            if (draggedItem && item.parentNode === parent) {
                                if (Array.from(parent.children).indexOf(draggedItem) < Array.from(parent.children).indexOf(item)) {
                                    item.parentNode.insertBefore(draggedItem, item.nextSibling);
                                } else {
                                    item.parentNode.insertBefore(draggedItem, item);
                                }
                            }
                        }
                    }
                });
            }
            
            const orderingSubmitBtn = document.getElementById('submitOrderingBtn');
            if (orderingSubmitBtn) {
                orderingSubmitBtn.removeEventListener('click', handleOrderingSubmit);
                orderingSubmitBtn.addEventListener('click', handleOrderingSubmit);
                function handleOrderingSubmit() {
                    if (hasAnsweredCurrentQuestion) return;
                    const listItems = document.getElementById('orderingList');
                    if (listItems) {
                        const newOrder = Array.from(listItems.children).map(child => 
                            question.items.indexOf(child.textContent)
                        );
                        onAnswerCallback(newOrder);
                    }
                }
            }
            break;
            
        case 'numeric':
            const numericSubmitBtn = document.getElementById('submitNumericBtn');
            if (numericSubmitBtn) {
                numericSubmitBtn.removeEventListener('click', handleNumericSubmit);
                numericSubmitBtn.addEventListener('click', handleNumericSubmit);
                function handleNumericSubmit() {
                    if (hasAnsweredCurrentQuestion) return;
                    const answer = parseFloat(document.getElementById('numericAnswer').value);
                    if (isNaN(answer)) {
                        document.getElementById('answerFeedback').innerHTML = '<p style="color: #ed8936;">⚠️ Please enter a valid number!</p>';
                        return;
                    }
                    onAnswerCallback(answer);
                }
            }
            break;
    }
}

async function submitAnswer(gameRef, playerId, answer, question, questionIndex, expiresAt) {
    try {
        // Check if already answered this question
        const answersRef = gameRef.collection('players').doc(playerId).collection('answers');
        const existingAns = await answersRef.doc('q' + questionIndex).get();
        
        if (existingAns.exists) {
            document.getElementById('answerFeedback').innerHTML = '<p style="color: #ed8936;">⚠️ You already answered this question!</p>';
            hasAnsweredCurrentQuestion = true;
            return;
        }
        
        const isCorrect = validateAnswer(question, answer);
        const timeLeft = Math.max(0, (expiresAt.getTime() - Date.now()) / 1000);
        const pointsEarned = calculatePoints(question, timeLeft, isCorrect);
        
        // Show feedback
        const feedbackDiv = document.getElementById('answerFeedback');
        if (isCorrect) {
            feedbackDiv.innerHTML = `
                <div style="background: #c6f6d5; padding: 15px; border-radius: 12px;">
                    ✅ CORRECT! +${pointsEarned} points!
                    ${question.explanation ? `<br><small>📖 ${escapeHtml(question.explanation)}</small>` : ''}
                </div>
            `;
        } else {
            let correctAnswerDisplay = getCorrectAnswerDisplay(question);
            feedbackDiv.innerHTML = `
                <div style="background: #fed7d7; padding: 15px; border-radius: 12px;">
                    ❌ Wrong! Correct answer: ${correctAnswerDisplay}
                    ${question.explanation ? `<br><small>📖 ${escapeHtml(question.explanation)}</small>` : ''}
                </div>
            `;
        }
        
        // Save answer with unique document ID
        await answersRef.doc('q' + questionIndex).set({
            questionIndex: questionIndex,
            answer: answer,
            correct: isCorrect,
            points: pointsEarned,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update player score
        const playerDocRef = gameRef.collection('players').doc(playerId);
        const playerDoc = await playerDocRef.get();
        const currentScore = playerDoc.data()?.score || 0;
        await playerDocRef.update({ score: currentScore + pointsEarned });
        
        // Disable options after answering
        disableQuestionInputs();
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        document.getElementById('answerFeedback').innerHTML = '<p style="color: #f56565;">Failed to submit answer. ' + error.message + '</p>';
        hasAnsweredCurrentQuestion = false; // Allow retry on error
    }
}

function getCorrectAnswerDisplay(question) {
    switch(question.type) {
        case 'multiple_choice':
            return question.options[question.correctAnswer];
        case 'true_false':
            return question.correctAnswer ? 'True' : 'False';
        case 'fill_blank':
            return question.correctAnswer;
        case 'numeric':
            return `${question.correctAnswer} ${question.unit || ''}`;
        case 'matching':
            return 'Please check the matching pairs above';
        case 'ordering':
            return 'Please check the correct order above';
        default:
            return 'Check the correct answer above';
    }
}

function disableQuestionInputs() {
    document.querySelectorAll('.option, .tf-option, button').forEach(el => {
        if (el.tagName === 'BUTTON') el.disabled = true;
        else el.style.pointerEvents = 'none';
    });
    const blankInput = document.getElementById('blankAnswer');
    if (blankInput) blankInput.disabled = true;
    const numericInput = document.getElementById('numericAnswer');
    if (numericInput) numericInput.disabled = true;
}

function startTimer(expiresAt) {
    if (window.timerInterval) clearInterval(window.timerInterval);
    
    window.timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
        const timerDiv = document.getElementById('timerDisplay');
        if (timerDiv) {
            timerDiv.innerText = remaining;
            
            if (remaining <= 5) {
                timerDiv.classList.add('timer-warning');
            } else {
                timerDiv.classList.remove('timer-warning');
            }
        }
        
        if (remaining <= 0) {
            clearInterval(window.timerInterval);
        }
    }, 200);
}