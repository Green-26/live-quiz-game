// ==================== QUESTION RENDERERS ====================
function renderQuestionForPlayer(question) {
    switch(question.type) {
        case 'multiple_choice':
            return `
                <h2>${escapeHtml(question.text)}</h2>
                <div class="options-container">
                    ${question.options.map((opt, i) => `
                        <div class="option" data-answer="${i}">
                            ${String.fromCharCode(65+i)}. ${escapeHtml(opt)}
                        </div>
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
                <button id="submitFillBtn" class="btn btn-primary">Submit Answer</button>
            `;
        case 'numeric':
            return `
                <h2>${escapeHtml(question.text)}</h2>
                <input type="number" id="numericAnswer" class="blank-input" placeholder="Enter number...">
                ${question.unit ? `<p>Unit: ${escapeHtml(question.unit)}</p>` : ''}
                <button id="submitNumericBtn" class="btn btn-primary">Submit Answer</button>
            `;
        default:
            return `<h2>${escapeHtml(question.text)}</h2>`;
    }
}

// ==================== RENDER QUESTION FORM FOR HOST ====================
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
        html += `
            <input type="text" id="correctAnswer" class="input-field mb-20" placeholder="Correct answer">
        `;
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

// ==================== BUILD QUESTION FROM FORM ====================
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

// ==================== VALIDATE ANSWER ====================
function validateAnswer(question, answer) {
    switch(question.type) {
        case 'multiple_choice':
            return answer === question.correctAnswer;
        case 'true_false':
            return String(answer) === String(question.correctAnswer);
        case 'fill_blank':
            return String(answer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase();
        case 'numeric':
            return Math.abs(parseFloat(answer) - question.correctAnswer) <= (question.tolerance || 0);
        default:
            return false;
    }
}

// ==================== CALCULATE POINTS ====================
function calculatePoints(question, timeLeft, isCorrect) {
    if (!isCorrect) return 0;
    const bonus = Math.floor((timeLeft / 15) * 50);
    const multiplier = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((question.points + bonus) * (multiplier[question.difficulty] || 1));
}

// ==================== GET CORRECT ANSWER TEXT ====================
function getCorrectAnswerText(question) {
    switch(question.type) {
        case 'multiple_choice': return question.options[question.correctAnswer];
        case 'true_false': return question.correctAnswer ? 'True' : 'False';
        case 'fill_blank': return question.correctAnswer;
        case 'numeric': return `${question.correctAnswer} ${question.unit || ''}`;
        default: return 'Unknown';
    }
}