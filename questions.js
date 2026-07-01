// ==================== QUESTIONS MODULE - COMPLETE ====================

let myQuestions = [];

function renderQuestionForm() {
    const type = document.getElementById('qType').value;
    const container = document.getElementById('questionForm');
    if (!container) return;

    let html = '<input type="text" id="qText" class="input" placeholder="Enter your question...">';

    if (type === 'mc') {
        html += `
            <input type="text" id="opt1" class="input" placeholder="Option A">
            <input type="text" id="opt2" class="input" placeholder="Option B">
            <input type="text" id="opt3" class="input" placeholder="Option C">
            <input type="text" id="opt4" class="input" placeholder="Option D">
            <select id="correctOpt" class="input">
                <option value="0">A is correct</option>
                <option value="1">B is correct</option>
                <option value="2">C is correct</option>
                <option value="3">D is correct</option>
            </select>
        `;
    } else if (type === 'tf') {
        html += `<select id="correctOpt" class="input"><option value="true">True</option><option value="false">False</option></select>`;
    } else if (type === 'fb') {
        html += `<input type="text" id="correctAns" class="input" placeholder="Correct answer">`;
    } else if (type === 'num') {
        html += `<input type="number" id="correctVal" class="input" placeholder="Correct answer">`;
    }

    html += `<input type="number" id="points" class="input" placeholder="Points" value="100">`;
    container.innerHTML = html;
}

function buildQuestion() {
    const type = document.getElementById('qType').value;
    const text = document.getElementById('qText')?.value.trim();
    const diff = document.getElementById('difficulty').value;
    const points = parseInt(document.getElementById('points')?.value) || 100;

    if (!text) { showToast('Please enter a question', 'error'); return null; }

    const q = { id: Date.now(), type, text, difficulty: diff, points };

    if (type === 'mc') {
        const o1 = document.getElementById('opt1')?.value.trim();
        const o2 = document.getElementById('opt2')?.value.trim();
        const o3 = document.getElementById('opt3')?.value.trim();
        const o4 = document.getElementById('opt4')?.value.trim();
        if (!o1 || !o2 || !o3 || !o4) { showToast('All options required', 'error'); return null; }
        q.options = [o1, o2, o3, o4];
        q.correct = parseInt(document.getElementById('correctOpt').value);
    } else if (type === 'tf') {
        q.correct = document.getElementById('correctOpt').value === 'true';
    } else if (type === 'fb') {
        const ca = document.getElementById('correctAns')?.value.trim();
        if (!ca) { showToast('Correct answer required', 'error'); return null; }
        q.correct = ca;
    } else if (type === 'num') {
        const cv = parseFloat(document.getElementById('correctVal')?.value);
        if (isNaN(cv)) { showToast('Correct value required', 'error'); return null; }
        q.correct = cv;
        q.unit = '';
    }
    return q;
}

function renderQuestions() {
    const container = document.getElementById('questionsList');
    if (!container) return;

    if (!myQuestions.length) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 30px;">📭 No questions yet. Add some above!</p>';
        return;
    }

    const typeLabels = { mc: 'Multiple Choice', tf: 'True/False', fb: 'Fill Blank', num: 'Numeric' };
    const badgeClasses = { mc: 'badge-mc', tf: 'badge-tf', fb: 'badge-fb', num: 'badge-num' };

    container.innerHTML = myQuestions.map((q, i) => `
        <div class="q-item">
            <div>
                <span class="badge ${badgeClasses[q.type] || 'badge-mc'}">${typeLabels[q.type] || q.type}</span>
                <strong style="margin-left: 8px;">${i+1}.</strong> ${escapeHtml(q.text.substring(0, 55))}${q.text.length > 55 ? '...' : ''}
                <span style="margin-left: 10px; color: var(--text-secondary);">🎯 ${q.points} pts</span>
            </div>
            <button class="remove-q" data-idx="${i}">✖ Remove</button>
        </div>
    `).join('');

    document.querySelectorAll('.remove-q').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.idx);
            myQuestions.splice(idx, 1);
            renderQuestions();
            showToast('Question removed', 'info');
        };
    });
}

function addQuestion() {
    const q = buildQuestion();
    if (q) {
        myQuestions.push(q);
        renderQuestions();
        // Clear inputs
        document.getElementById('qText').value = '';
        ['opt1','opt2','opt3','opt4','correctAns','correctVal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        showToast('Question added!', 'success');
    }
}

function addSamples() {
    myQuestions.push({ id: Date.now()+1, type: 'mc', text: 'What is the capital of France?', options: ['London','Paris','Berlin','Madrid'], correct: 1, difficulty: 'easy', points: 100 });
    myQuestions.push({ id: Date.now()+2, type: 'tf', text: 'The Earth is flat', correct: false, difficulty: 'easy', points: 50 });
    myQuestions.push({ id: Date.now()+3, type: 'num', text: 'What is 15 + 27?', correct: 42, difficulty: 'easy', points: 75 });
    myQuestions.push({ id: Date.now()+4, type: 'fb', text: 'Water freezes at ______ degrees Celsius', correct: '0', difficulty: 'easy', points: 50 });
    renderQuestions();
    showToast('4 sample questions added!', 'success');
}

function clearQuestions() {
    if (confirm('⚠️ Clear ALL questions?')) {
        myQuestions = [];
        renderQuestions();
        showToast('All questions cleared', 'info');
    }
}

function getCorrectAnswerText(q) {
    if (q.type === 'mc') return q.options[q.correct];
    if (q.type === 'tf') return q.correct ? 'True' : 'False';
    if (q.type === 'fb') return q.correct;
    if (q.type === 'num') return `${q.correct}`;
    return 'Unknown';
}