// ==================== QUESTION FUNCTIONS ====================

function renderQuestionForm() {
    const type = document.getElementById('questionType').value;
    const container = document.getElementById('questionFormContainer');
    
    let html = '<input type="text" id="questionText" class="input-field mb-20" placeholder="Enter your question...">';
    
    if (type === 'multiple_choice') {
        html += `
            <input type="text" id="opt1" class="input-field mb-20" placeholder="Option A">
            <input type="text" id="opt2" class="input-field mb-20" placeholder="Option B">
            <input type="text" id="opt3" class="input-field mb-20" placeholder="Option C">
            <input type="text" id="opt4" class="input-field mb-20" placeholder="Option D">
            <select id="correctOpt" class="input-field mb-20">
                <option value="0">Option A is correct</option>
                <option value="1">Option B is correct</option>
                <option value="2">Option C is correct</option>
                <option value="3">Option D is correct</option>
            </select>
        `;
    } else if (type === 'true_false') {
        html += `
            <select id="correctOpt" class="input-field mb-20">
                <option value="true">True</option>
                <option value="false">False</option>
            </select>
        `;
    } else if (type === 'fill_blank') {
        html += `<input type="text" id="correctAnswer" class="input-field mb-20" placeholder="Correct answer">`;
    } else if (type === 'numeric') {
        html += `
            <input type="number" id="correctValue" class="input-field mb-20" placeholder="Correct answer">
            <input type="text" id="unit" class="input-field mb-20" placeholder="Unit (optional)">
        `;
    }
    
    html += `
        <input type="text" id="explanation" class="input-field mb-20" placeholder="Explanation (optional)">
        <input type="number" id="points" class="input-field" placeholder="Points" value="100">
    `;
    
    container.innerHTML = html;
}

function buildQuestion() {
    const type = document.getElementById('questionType').value;
    const text = document.getElementById('questionText')?.value.trim();
    const difficulty = document.getElementById('difficulty').value;
    const subject = document.getElementById('subject').value;
    const points = parseInt(document.getElementById('points')?.value) || 100;
    const explanation = document.getElementById('explanation')?.value || '';
    
    if (!text) {
        alert('Please enter a question');
        return null;
    }
    
    const question = {
        id: Date.now(),
        type: type,
        text: text,
        difficulty: difficulty,
        subject: subject,
        points: points,
        explanation: explanation
    };
    
    if (type === 'multiple_choice') {
        const opt1 = document.getElementById('opt1')?.value.trim();
        const opt2 = document.getElementById('opt2')?.value.trim();
        const opt3 = document.getElementById('opt3')?.value.trim();
        const opt4 = document.getElementById('opt4')?.value.trim();
        
        if (!opt1 || !opt2 || !opt3 || !opt4) {
            alert('All options are required');
            return null;
        }
        
        question.options = [opt1, opt2, opt3, opt4];
        question.correctAnswer = parseInt(document.getElementById('correctOpt').value);
    } else if (type === 'true_false') {
        question.correctAnswer = document.getElementById('correctOpt').value === 'true';
    } else if (type === 'fill_blank') {
        const correct = document.getElementById('correctAnswer')?.value.trim();
        if (!correct) {
            alert('Correct answer is required');
            return null;
        }
        question.correctAnswer = correct;
    } else if (type === 'numeric') {
        const correct = parseFloat(document.getElementById('correctValue')?.value);
        if (isNaN(correct)) {
            alert('Correct answer is required');
            return null;
        }
        question.correctAnswer = correct;
        question.unit = document.getElementById('unit')?.value || '';
        question.tolerance = 0;
    }
    
    return question;
}

function renderQuestionsList() {
    const container = document.getElementById('questionsListContainer');
    
    if (!currentQuestions || currentQuestions.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#718096; padding:20px;">📭 No questions yet. Add some above!</p>';
        return;
    }
    
    container.innerHTML = currentQuestions.map((q, i) => `
        <div class="question-item">
            <div>
                <span class="question-badge">${q.type.replace('_', ' ')}</span>
                <strong>Q${i+1}:</strong> ${escapeHtml(q.text.substring(0, 50))}
                <span style="margin-left:10px;">🎯 ${q.points} pts</span>
            </div>
            <button class="remove-btn" data-index="${i}">✖ Remove</button>
        </div>
    `).join('');
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            if (confirm('Remove this question?')) {
                currentQuestions.splice(index, 1);
                renderQuestionsList();
                saveQuestionsToLocal();
            }
        });
    });
}

function saveQuestionsToLocal() {
    localStorage.setItem('teacherQuiz', JSON.stringify(currentQuestions));
}

function loadQuestionsFromLocal() {
    const saved = localStorage.getItem('teacherQuiz');
    if (saved) {
        currentQuestions = JSON.parse(saved);
        renderQuestionsList();
    }
}

function addSampleQuestions() {
    const samples = [
        { id: Date.now()+1, type: 'multiple_choice', text: 'What is the capital of France?', options: ['London', 'Paris', 'Berlin', 'Madrid'], correctAnswer: 1, difficulty: 'easy', subject: 'geography', points: 100, explanation: 'Paris is the capital of France' },
        { id: Date.now()+2, type: 'true_false', text: 'The Earth is flat', correctAnswer: false, difficulty: 'easy', subject: 'science', points: 50, explanation: 'The Earth is actually round' },
        { id: Date.now()+3, type: 'numeric', text: 'What is 15 + 27?', correctAnswer: 42, difficulty: 'easy', subject: 'math', points: 75 },
        { id: Date.now()+4, type: 'fill_blank', text: 'Water freezes at ______ degrees Celsius', correctAnswer: '0', difficulty: 'easy', subject: 'science', points: 50 }
    ];
    
    currentQuestions.push(...samples);
    renderQuestionsList();
    saveQuestionsToLocal();
    alert(`Added ${samples.length} sample questions!`);
}

function clearAllQuestions() {
    if (confirm('⚠️ Clear ALL questions?')) {
        currentQuestions = [];
        renderQuestionsList();
        saveQuestionsToLocal();
        alert('All questions cleared');
    }
}

function addQuestion() {
    const question = buildQuestion();
    if (!question) return;
    
    currentQuestions.push(question);
    renderQuestionsList();
    saveQuestionsToLocal();
    
    // Clear form
    document.getElementById('questionText').value = '';
    if (document.getElementById('opt1')) document.getElementById('opt1').value = '';
    if (document.getElementById('opt2')) document.getElementById('opt2').value = '';
    if (document.getElementById('opt3')) document.getElementById('opt3').value = '';
    if (document.getElementById('opt4')) document.getElementById('opt4').value = '';
    
    alert('Question added!');
}

function getCorrectAnswerText(question) {
    switch(question.type) {
        case 'multiple_choice': return question.options[question.correctAnswer];
        case 'true_false': return question.correctAnswer ? 'True' : 'False';
        case 'fill_blank': return question.correctAnswer;
        case 'numeric': return `${question.correctAnswer} ${question.unit || ''}`;
        default: return 'Unknown';
    }
}

function validateAnswer(question, answer) {
    switch(question.type) {
        case 'multiple_choice': return answer === question.correctAnswer;
        case 'true_false': return String(answer) === String(question.correctAnswer);
        case 'fill_blank': return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase();
        case 'numeric': return Math.abs(parseFloat(answer) - question.correctAnswer) <= (question.tolerance || 0);
        default: return false;
    }
}

function calculatePoints(question, timeLeft, isCorrect) {
    if (!isCorrect) return 0;
    const bonus = Math.floor((timeLeft / 15) * 50);
    const multiplier = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((question.points + bonus) * (multiplier[question.difficulty] || 1));
}

function renderQuestionForPlayer(question) {
    switch(question.type) {
        case 'multiple_choice':
            return `
                <h2>${escapeHtml(question.text)}</h2>
                <div class="options-container">
                    ${question.options.map((opt, i) => `
                        <div class="option" data-answer="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(opt)}</div>
                    `).join('')}
                </div>
            `;
        case 'true_false':
            return `
                <h2>${escapeHtml(question.text)}</h2>
                <div class="tf-options">
                    <div class="tf-option true" data-answer="true">✅ TRUE</div>
                    <div class="tf-option false" data-answer="false">❌ FALSE</div>
                </div>
            `;
        case 'fill_blank':
            return `
                <h2>${escapeHtml(question.text)}</h2>
                <input type="text" id="fillAnswer" class="blank-input" placeholder="Type your answer...">
                <button id="submitAnswerBtn" class="btn btn-primary">Submit Answer</button>
            `;
        case 'numeric':
            return `
                <h2>${escapeHtml(question.text)}</h2>
                <input type="number" id="numericAnswer" class="blank-input" placeholder="Enter number...">
                ${question.unit ? `<p>Unit: ${escapeHtml(question.unit)}</p>` : ''}
                <button id="submitAnswerBtn" class="btn btn-primary">Submit Answer</button>
            `;
        default:
            return `<h2>${escapeHtml(question.text)}</h2>`;
    }
}