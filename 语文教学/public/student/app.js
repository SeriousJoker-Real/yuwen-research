// 语文课前调研 - 学生端
const API_BASE = '/api';

let currentSurvey = null;
let answers = [];
let currentStep = 'info'; // info, questions, submit, success

async function apiGet(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`API错误: ${res.status}`);
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`API错误: ${res.status}`);
  return res.json();
}

// 获取URL参数
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// 初始化
async function init() {
  const surveyId = getQueryParam('survey');

  if (!surveyId) {
    document.getElementById('survey-container').innerHTML = `
      <div class="empty-state">
        <p>请使用老师提供的链接进入调研</p>
      </div>
    `;
    return;
  }

  try {
    currentSurvey = await apiGet(`/surveys/${surveyId}`);
  } catch (e) {
    document.getElementById('survey-container').innerHTML = `
      <div class="empty-state">
        <p>调研不存在或已失效</p>
        <p style="font-size:14px;color:#999;margin-top:8px;">请检查链接是否正确</p>
      </div>
    `;
    return;
  }

  if (!currentSurvey) {
    document.getElementById('survey-container').innerHTML = `
      <div class="empty-state">
        <p>调研不存在</p>
      </div>
    `;
    return;
  }

  // 初始化答案数组
  answers = currentSurvey.questions.map(q => ({
    questionId: q.id,
    questionType: q.type,
    questionText: q.text,
    answer: ''
  }));

  // 渲染班级下拉框
  renderClassOptions();

  renderInfoPage();
}

function renderClassOptions() {
  const select = document.getElementById('student-class');
  if (currentSurvey.classes && currentSurvey.classes.length > 0) {
    select.innerHTML = '<option value="">请选择班级</option>' +
      currentSurvey.classes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  } else {
    // 没有预设班级时，显示输入框
    select.outerHTML = `<input type="text" id="student-class" placeholder="请填写你的班级" required>`;
  }
}

function renderInfoPage() {
  currentStep = 'info';
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-text').textContent = '1/3 基本信息';

  document.getElementById('info-page').style.display = 'block';
  document.getElementById('questions-page').style.display = 'none';
  document.getElementById('submit-page').style.display = 'none';
  document.getElementById('success-page').style.display = 'none';

  document.getElementById('survey-title').textContent = currentSurvey.title;
  document.getElementById('survey-subtitle').textContent = currentSurvey.subtitle || '';
  document.getElementById('survey-meta').innerHTML = `
    <span>📚 课文：${currentSurvey.textTitle}${currentSurvey.textAuthor ? ' · ' + currentSurvey.textAuthor : ''}</span>
    <span>📝 ${currentSurvey.questions.length} 道题</span>
    <span>⏱️ 约 5-10 分钟</span>
  `;
}

function startSurvey() {
  const name = document.getElementById('student-name').value.trim();
  const classEl = document.getElementById('student-class');
  const className = classEl ? classEl.value.trim() : '';

  if (!name) {
    alert('请填写你的姓名');
    return;
  }
  if (!className) {
    alert('请选择或填写你的班级');
    return;
  }

  currentStep = 'questions';
  document.getElementById('progress-bar').style.width = '50%';
  document.getElementById('progress-text').textContent = '2/3 填写调研';

  document.getElementById('info-page').style.display = 'none';
  document.getElementById('questions-page').style.display = 'block';
  document.getElementById('submit-page').style.display = 'none';
  document.getElementById('success-page').style.display = 'none';

  renderQuestions();
}

function renderQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = currentSurvey.questions.map((q, i) => `
    <div class="question-card">
      <div class="question-number">第 ${i + 1} 题</div>
      <div class="question-text">${escapeHtml(q.text)}</div>
      <div class="answer-area">
        ${q.type === 'choice' ? renderChoice(q, i) : renderOpen(q, i)}
      </div>
    </div>
  `).join('');
}

function renderChoice(question, index) {
  return `
    <div class="choice-options">
      ${question.options.map((opt, oi) => `
        <label class="choice-option">
          <input type="radio" name="q${index}" value="${escapeHtml(opt)}"
            onchange="updateAnswer(${index}, '${escapeHtml(opt)}')"
            ${answers[index].answer === opt ? 'checked' : ''}>
          <span class="choice-label">${String.fromCharCode(65 + oi)}. ${escapeHtml(opt)}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function renderOpen(question, index) {
  return `
    <textarea
      class="answer-textarea"
      placeholder="请写下你的想法..."
      rows="4"
      oninput="updateAnswer(${index}, this.value)"
    >${escapeHtml(answers[index].answer)}</textarea>
  `;
}

function updateAnswer(index, value) {
  answers[index].answer = value;
}

function goToSubmit() {
  // 检查是否有未填写的题
  const unanswered = answers.filter(a => !a.answer || !a.answer.trim()).length;
  if (unanswered > 0) {
    if (!confirm(`还有 ${unanswered} 道题未填写，确定要提交吗？`)) return;
  }

  currentStep = 'submit';
  document.getElementById('progress-bar').style.width = '85%';
  document.getElementById('progress-text').textContent = '3/3 确认提交';

  document.getElementById('info-page').style.display = 'none';
  document.getElementById('questions-page').style.display = 'none';
  document.getElementById('submit-page').style.display = 'block';
  document.getElementById('success-page').style.display = 'none';

  // 渲染提交确认页
  const name = document.getElementById('student-name').value.trim();
  const classEl = document.getElementById('student-class');
  const className = classEl ? classEl.value.trim() : '';

  const answeredCount = answers.filter(a => a.answer && a.answer.trim()).length;
  document.getElementById('submit-summary').innerHTML = `
    <div class="summary-row">
      <span>👤 姓名</span>
      <strong>${escapeHtml(name)}</strong>
    </div>
    <div class="summary-row">
      <span>🏫 班级</span>
      <strong>${escapeHtml(className)}</strong>
    </div>
    <div class="summary-row">
      <span>📝 答题进度</span>
      <strong>${answeredCount} / ${answers.length} 题</strong>
    </div>
    <div class="summary-row">
      <span>📋 调研</span>
      <strong>${currentSurvey.title}</strong>
    </div>
  `;
}

function goBackToQuestions() {
  currentStep = 'questions';
  document.getElementById('progress-bar').style.width = '50%';
  document.getElementById('progress-text').textContent = '2/3 填写调研';

  document.getElementById('questions-page').style.display = 'block';
  document.getElementById('submit-page').style.display = 'none';
}

async function submitSurvey() {
  const name = document.getElementById('student-name').value.trim();
  const classEl = document.getElementById('student-class');
  const className = classEl ? classEl.value.trim() : '';

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.textContent = '提交中...';
  submitBtn.disabled = true;

  try {
    await apiPost(`/surveys/${currentSurvey.id}/responses`, {
      studentName: name,
      studentClass: className,
      answers: answers
    });

    showSuccess();
  } catch (e) {
    alert('提交失败: ' + e.message);
    submitBtn.textContent = '提交调研';
    submitBtn.disabled = false;
  }
}

function showSuccess() {
  currentStep = 'success';
  document.getElementById('progress-bar').style.width = '100%';
  document.getElementById('progress-text').textContent = '提交完成 ✓';

  document.getElementById('submit-page').style.display = 'none';
  document.getElementById('success-page').style.display = 'block';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 启动
window.addEventListener('DOMContentLoaded', init);
