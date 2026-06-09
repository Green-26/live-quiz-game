// ==================== QUESTION TYPE RENDERERS ====================
const QuestionRenderers = {
    multiple_choice: (question, onAnswer) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <div class="options-container">
                ${question.options.map((opt, idx) => `
                    <div class="option" data-opt-index="${idx}">
                        ${String.fromCharCode(65 + idx)}. ${escapeHtml(opt)}
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    true_false: (question, onAnswer) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <div class="tf-options">
                <div class="tf-option true" data-value="true">✅ TRUE</div>
                <div class="tf-option false" data-value="false">❌ FALSE</div>
            </div>
        `;
    },
    
    fill_blank: (question, onAnswer) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <input type="text" id="blankAnswer" class="blank-input" placeholder="Type your answer here...">
            <button id="submitBlankBtn" class="btn btn-primary">Submit Answer</button>
        `;
    },
    
    matching: (question, onAnswer) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <div class="matching-container">
                <div class="matching-left">
                    <h4>Match these:</h4>
                    ${question.leftItems.map((item, idx) => `
                        <div class="matching-item" data-left-idx="${idx}">${escapeHtml(item)}</div>
                    `).join('')}
                </div>
                <div class="matching-right">
                    <h4>With these:</h4>
                    ${question.rightItems.map((item, idx) => `
                        <div class="matching-item" data-right-idx="${idx}">${escapeHtml(item)}</div>
                    `).join('')}
                </div>
            </div>
            <button id="submitMatchingBtn" class="btn btn-primary">Submit Matches</button>
            <div id="matchingStatus"></div>
        `;
    },
    
    ordering: (question, onAnswer) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <p>Drag to arrange in correct order:</p>
            <ul class="ordering-list" id="orderingList">
                ${question.items.map((item, idx) => `
                    <li class="ordering-item" data-order="${idx}">${escapeHtml(item)}</li>
                `).join('')}
            </ul>
            <button id="submitOrderingBtn" class="btn btn-primary">Submit Order</button>
        `;
    },
    
    numeric: (question, onAnswer) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <input type="number" id="numericAnswer" class="blank-input" placeholder="Enter your numeric answer..." step="any">
            ${question.unit ? `<p style="color: #718096;">Unit: ${escapeHtml(question.unit)}</p>` : ''}
            <button id="submitNumericBtn" class="btn btn-primary">Submit Answer</button>
        `;
    }
};

// ==================== QUESTION FORM BUILDER FOR HOST ====================
function renderQuestionForm() {
    const type = document.getElementById('questionTypeSelect').value;
    const formDiv = document.getElementById('questionForm');
    
    switch(type) {
        case 'multiple_choice':
            formDiv.innerHTML = `
                <input type="text" id="qText" placeholder="Question text" class="input-field mb-20">
                <input type="text" id="opt1" placeholder="Option A" class="input-field mb-20">
                <input type="text" id="opt2" placeholder="Option B" class="input-field mb-20">
                <input type="text" id="opt3" placeholder="Option C" class="input-field mb-20">
                <input type="text" id="opt4" placeholder="Option D" class="input-field mb-20">
                <select id="correctOpt" class="input-field">
                    <option value="0">Option A is correct</option>
                    <option value="1">Option B is correct</option>
                    <option value="2">Option C is correct</option>
                    <option value="3">Option D is correct</option>
                </select>
                <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field">
                <input type="number" id="points" placeholder="Points (default: 100)" class="input-field" value="100">
            `;
            break;
            
        case 'true_false':
            formDiv.innerHTML = `
                <input type="text" id="qText" placeholder="Question text" class="input-field mb-20">
                <select id="correctOpt" class="input-field">
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
                <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field">
                <input type="number" id="points" placeholder="Points (default: 100)" class="input-field" value="100">
            `;
            break;
            
        case 'fill_blank':
            formDiv.innerHTML = `
                <input type="text" id="qText" placeholder='Question text (use ______ for blank)' class="input-field mb-20">
                <input type="text" id="correctAnswer" placeholder="Correct answer" class="input-field mb-20">
                <input type="text" id="altAnswers" placeholder="Alternative answers (comma separated)" class="input-field mb-20">
                <label><input type="checkbox" id="caseSensitive"> Case sensitive</label>
                <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field mt-20">
                <input type="number" id="points" placeholder="Points (default: 100)" class="input-field" value="100">
            `;
            break;
            
        case 'matching':
            formDiv.innerHTML = `
                <input type="text" id="qText" placeholder="Question text" class="input-field mb-20">
                <textarea id="leftItems" placeholder="Left items (one per line)" rows="3" class="input-field mb-20"></textarea>
                <textarea id="rightItems" placeholder="Right items (one per line - matching order)" rows="3" class="input-field mb-20"></textarea>
                <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field">
                <input type="number" id="points" placeholder="Points (default: 100)" class="input-field" value="100">
            `;
            break;
            
        case 'ordering':
            formDiv.innerHTML = `
                <input type="text" id="qText" placeholder="Question text" class="input-field mb-20">
                <textarea id="items" placeholder="Items to order (one per line - correct order from top to bottom)" rows="4" class="input-field mb-20"></textarea>
                <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field">
                <input type="number" id="points" placeholder="Points (default: 100)" class="input-field" value="100">
            `;
            break;
            
        case 'numeric':
            formDiv.innerHTML = `
                <input type="text" id="qText" placeholder="Question text" class="input-field mb-20">
                <input type="number" id="correctValue" placeholder="Correct numeric answer" class="input-field mb-20" step="any">
                <input type="number" id="tolerance" placeholder="Tolerance (±)" class="input-field mb-20" value="0">
                <input type="text" id="unit" placeholder="Unit (e.g., cm, kg, $)" class="input-field mb-20">
                <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field">
                <input type="number" id="points" placeholder="Points (default: 100)" class="input-field" value="100">
            `;
            break;
    }
}

// ==================== BUILD QUESTION FROM FORM ====================
function buildQuestionFromForm() {
    const type = document.getElementById('questionTypeSelect').value;
    const text = document.getElementById('qText')?.value;
    const difficulty = document.getElementById('difficultySelect').value;
    const subject = document.getElementById('subjectSelect').value;
    const points = parseInt(document.getElementById('points')?.value) || 100;
    const explanation = document.getElementById('explanation')?.value || '';
    
    if (!text) {
        alert('Please enter question text');
        return null;
    }
    
    const baseQuestion = {
        id: Date.now() + Math.random(),
        type: type,
        text: text,
        difficulty: difficulty,
        subject: subject,
        points: points,
        explanation: explanation
    };
    
    switch(type) {
        case 'multiple_choice':
            const options = [
                document.getElementById('opt1')?.value,
                document.getElementById('opt2')?.value,
                document.getElementById('opt3')?.value,
                document.getElementById('opt4')?.value
            ];
            if (options.some(opt => !opt)) {
                alert('All options are required');
                return null;
            }
            baseQuestion.options = options;
            baseQuestion.correctAnswer = parseInt(document.getElementById('correctOpt').value);
            break;
            
        case 'true_false':
            baseQuestion.correctAnswer = document.getElementById('correctOpt').value === 'true';
            break;
            
        case 'fill_blank':
            const correctAnswer = document.getElementById('correctAnswer')?.value;
            const altAnswers = document.getElementById('altAnswers')?.value.split(',').map(a => a.trim());
            if (!correctAnswer) {
                alert('Correct answer is required');
                return null;
            }
            baseQuestion.correctAnswer = correctAnswer;
            baseQuestion.alternativeAnswers = altAnswers.filter(a => a);
            baseQuestion.caseSensitive = document.getElementById('caseSensitive')?.checked || false;
            break;
            
        case 'matching':
            const leftItems = document.getElementById('leftItems')?.value.split('\n').filter(l => l.trim());
            const rightItems = document.getElementById('rightItems')?.value.split('\n').filter(r => r.trim());
            if (!leftItems.length || !rightItems.length || leftItems.length !== rightItems.length) {
                alert('Please provide equal number of left and right items (one per line)');
                return null;
            }
            baseQuestion.leftItems = leftItems;
            baseQuestion.rightItems = rightItems;
            baseQuestion.correctAnswer = leftItems.map((_, i) => i);
            break;
            
        case 'ordering':
            const items = document.getElementById('items')?.value.split('\n').filter(i => i.trim());
            if (items.length < 2) {
                alert('Please provide at least 2 items to order');
                return null;
            }
            baseQuestion.items = items;
            baseQuestion.correctOrder = items.map((_, i) => i);
            break;
            
        case 'numeric':
            const correctValue = parseFloat(document.getElementById('correctValue')?.value);
            const tolerance = parseFloat(document.getElementById('tolerance')?.value) || 0;
            if (isNaN(correctValue)) {
                alert('Correct numeric value is required');
                return null;
            }
            baseQuestion.correctAnswer = correctValue;
            baseQuestion.tolerance = tolerance;
            baseQuestion.unit = document.getElementById('unit')?.value || '';
            break;
    }
    
    return baseQuestion;
}

// ==================== VALIDATE ANSWER ====================
function validateAnswer(question, userAnswer) {
    switch(question.type) {
        case 'multiple_choice':
            return userAnswer === question.correctAnswer;
        case 'true_false':
            return userAnswer === question.correctAnswer;
        case 'fill_blank':
            const userAnswerStr = question.caseSensitive ? userAnswer : userAnswer.toLowerCase();
            const correctStr = question.caseSensitive ? question.correctAnswer : question.correctAnswer.toLowerCase();
            if (userAnswerStr === correctStr) return true;
            if (question.alternativeAnswers) {
                return question.alternativeAnswers.some(alt => 
                    question.caseSensitive ? alt === userAnswer : alt.toLowerCase() === userAnswerStr
                );
            }
            return false;
        case 'matching':
            return JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);
        case 'ordering':
            return JSON.stringify(userAnswer) === JSON.stringify(question.correctOrder);
        case 'numeric':
            return Math.abs(userAnswer - question.correctAnswer) <= (question.tolerance || 0);
        default:
            return false;
    }
}

// ==================== CALCULATE POINTS ====================
function calculatePoints(question, timeLeft, isCorrect) {
    if (!isCorrect) return 0;
    const timeBonus = Math.floor((timeLeft / 15) * 50);
    const difficultyMultiplier = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((question.points + timeBonus) * (difficultyMultiplier[question.difficulty] || 1));
}

// ==================== ESCAPE HTML ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}