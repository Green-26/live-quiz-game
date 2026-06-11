// ==================== QUESTION RENDERERS ====================
const QuestionRenderers = {
    multiple_choice: (question) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <div class="options-container">
                ${question.options.map((opt, idx) => `
                    <div class="option" data-value="${idx}">
                        ${String.fromCharCode(65 + idx)}. ${escapeHtml(opt)}
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    true_false: (question) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <div class="tf-options">
                <div class="tf-option true" data-value="true">✅ TRUE</div>
                <div class="tf-option false" data-value="false">❌ FALSE</div>
            </div>
        `;
    },
    
    fill_blank: (question) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <input type="text" id="blankAnswer" class="blank-input" placeholder="Type your answer here...">
            <button id="submitAnswerBtn" class="btn btn-primary mt-20">Submit Answer</button>
        `;
    },
    
    numeric: (question) => {
        return `
            <h2 style="margin-bottom: 20px;">${escapeHtml(question.text)}</h2>
            <input type="number" id="numericAnswer" class="blank-input" placeholder="Enter your answer..." step="any">
            ${question.unit ? `<p style="color: #718096;">Unit: ${escapeHtml(question.unit)}</p>` : ''}
            <button id="submitAnswerBtn" class="btn btn-primary mt-20">Submit Answer</button>
        `;
    }
};

// ==================== RENDER QUESTION FORM FOR HOST ====================
function renderQuestionForm() {
    const type = document.getElementById('questionTypeSelect')?.value;
    const formDiv = document.getElementById('questionForm');
    
    if (!formDiv) return;
    
    formDiv.innerHTML = '';
    
    const commonFields = `
        <input type="text" id="qText" placeholder="Question text" class="input-field mb-20" required>
    `;
    
    let typeFields = '';
    
    switch(type) {
        case 'multiple_choice':
            typeFields = `
                <input type="text" id="opt1" placeholder="Option A" class="input-field mb-20">
                <input type="text" id="opt2" placeholder="Option B" class="input-field mb-20">
                <input type="text" id="opt3" placeholder="Option C" class="input-field mb-20">
                <input type="text" id="opt4" placeholder="Option D" class="input-field mb-20">
                <select id="correctOpt" class="input-field mb-20">
                    <option value="0">Option A is correct</option>
                    <option value="1">Option B is correct</option>
                    <option value="2">Option C is correct</option>
                    <option value="3">Option D is correct</option>
                </select>
            `;
            break;
        case 'true_false':
            typeFields = `
                <select id="correctOpt" class="input-field mb-20">
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            `;
            break;
        case 'fill_blank':
            typeFields = `
                <input type="text" id="correctAnswer" placeholder="Correct answer" class="input-field mb-20">
                <input type="text" id="altAnswers" placeholder="Alternative answers (comma separated)" class="input-field mb-20">
            `;
            break;
        case 'numeric':
            typeFields = `
                <input type="number" id="correctValue" placeholder="Correct answer" class="input-field mb-20" step="any">
                <input type="number" id="tolerance" placeholder="Tolerance (±)" class="input-field mb-20" value="0">
                <input type="text" id="unit" placeholder="Unit" class="input-field mb-20">
            `;
            break;
    }
    
    const extraFields = `
        <input type="text" id="explanation" placeholder="Explanation (optional)" class="input-field mb-20">
        <input type="number" id="points" placeholder="Points" class="input-field" value="100">
    `;
    
    formDiv.innerHTML = commonFields + typeFields + extraFields;
}

// ==================== BUILD QUESTION FROM FORM ====================
function buildQuestionFromForm() {
    const type = document.getElementById('questionTypeSelect').value;
    const text = document.getElementById('qText')?.value.trim();
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
                document.getElementById('opt1')?.value.trim(),
                document.getElementById('opt2')?.value.trim(),
                document.getElementById('opt3')?.value.trim(),
                document.getElementById('opt4')?.value.trim()
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
            const correctAnswer = document.getElementById('correctAnswer')?.value.trim();
            if (!correctAnswer) {
                alert('Correct answer is required');
                return null;
            }
            baseQuestion.correctAnswer = correctAnswer;
            baseQuestion.alternativeAnswers = [];
            baseQuestion.caseSensitive = false;
            break;
            
        case 'numeric':
            const correctValue = parseFloat(document.getElementById('correctValue')?.value);
            if (isNaN(correctValue)) {
                alert('Correct numeric value is required');
                return null;
            }
            baseQuestion.correctAnswer = correctValue;
            baseQuestion.tolerance = parseFloat(document.getElementById('tolerance')?.value) || 0;
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
            const userStr = userAnswer.toLowerCase().trim();
            const correctStr = question.correctAnswer.toLowerCase();
            if (userStr === correctStr) return true;
            if (question.alternativeAnswers) {
                return question.alternativeAnswers.some(alt => alt.toLowerCase() === userStr);
            }
            return false;
        case 'numeric':
            return Math.abs(userAnswer - question.correctAnswer) <= question.tolerance;
        default:
            return false;
    }
}

// ==================== CALCULATE POINTS ====================
function calculatePoints(question, timeLeft, isCorrect) {
    if (!isCorrect) return 0;
    const timeBonus = Math.floor((timeLeft / 15) * 50);
    const multipliers = { easy: 1, medium: 1.5, hard: 2 };
    return Math.floor((question.points + timeBonus) * (multipliers[question.difficulty] || 1));
}

// ==================== GET CORRECT ANSWER DISPLAY ====================
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
        default:
            return 'Check above';
    }
}