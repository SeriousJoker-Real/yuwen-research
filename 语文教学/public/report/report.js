// 语文课前调研报告 - 教师端
const API_BASE = '/api';

let currentSurvey = null;
let responses = [];
let analysisResult = null;
let filterClass = 'all';

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

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function init() {
  const surveyId = getQueryParam('survey');
  if (!surveyId) {
    document.getElementById('report-container').innerHTML = '<div class="empty-state">请指定调研ID</div>';
    return;
  }

  try {
    [currentSurvey, responses] = await Promise.all([
      apiGet(`/surveys/${surveyId}`),
      apiGet(`/surveys/${surveyId}/responses`)
    ]);
  } catch (e) {
    document.getElementById('report-container').innerHTML = `
      <div class="empty-state">
        <p>加载失败</p>
        <p style="font-size:14px;color:#999;">${e.message}</p>
      </div>
    `;
    return;
  }

  if (!currentSurvey) {
    document.getElementById('report-container').innerHTML = '<div class="empty-state">调研不存在</div>';
    return;
  }

  renderHeader();
  renderClassFilters();
  renderStudentList();

  // 如果有回答，自动触发分析
  if (responses.length > 0) {
    runAnalysis();
  } else {
    document.getElementById('analysis-loading').style.display = 'none';
    document.getElementById('analysis-empty').style.display = 'block';
  }
}

function renderHeader() {
  document.getElementById('survey-title').textContent = currentSurvey.title;
  document.getElementById('survey-subtitle').textContent = `课文：${currentSurvey.textTitle} · ${currentSurvey.textAuthor || '佚名'} · ${currentSurvey.textTypeName || '散文'}`;
  document.getElementById('total-students').textContent = responses.length;
  document.getElementById('total-questions').textContent = currentSurvey.questions.length;
  document.getElementById('total-classes').textContent = getClasses().length;
  document.getElementById('report-time').textContent = formatDateTime(new Date());
}

function getClasses() {
  const classSet = new Set(responses.map(r => r.studentClass).filter(Boolean));
  return Array.from(classSet).sort();
}

function getFilteredResponses() {
  if (filterClass === 'all') return responses;
  return responses.filter(r => r.studentClass === filterClass);
}

function renderClassFilters() {
  const classes = getClasses();
  const container = document.getElementById('class-filters');
  if (classes.length <= 1) {
    container.style.display = 'none';
    // 也隐藏班级对比模块
    const compareSection = document.getElementById('class-compare-section');
    if (compareSection) compareSection.style.display = 'none';
    return;
  }

  container.innerHTML = `
    <span class="filter-label">班级筛选：</span>
    <button class="class-filter-btn ${filterClass === 'all' ? 'active' : ''}" onclick="filterByClass('all')">全部班级</button>
    ${classes.map(c => `
      <button class="class-filter-btn ${filterClass === c ? 'active' : ''}" onclick="filterByClass('${escapeHtml(c)}')">${escapeHtml(c)}</button>
    `).join('')}
  `;
}

function filterByClass(className) {
  filterClass = className;
  renderClassFilters();
  renderStudentList();
  // 重新计算头部统计
  const filtered = getFilteredResponses();
  document.getElementById('total-students').textContent = filtered.length;
}

function renderStudentList() {
  const filtered = getFilteredResponses();
  const tbody = document.querySelector('#student-table tbody');

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:30px;">暂无学生回答</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((r, i) => {
    const answeredCount = r.answers.filter(a => a.answer && a.answer.trim()).length;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.studentClass || '未填写')}</td>
        <td><strong>${escapeHtml(r.studentName)}</strong></td>
        <td>${answeredCount}/${r.answers.length}</td>
        <td>${formatDateTime(r.submittedAt)}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="viewStudentDetail('${r.responseId}')">查看详情</button>
        </td>
      </tr>
    `;
  }).join('');
}

function viewStudentDetail(responseId) {
  const resp = responses.find(r => r.responseId === responseId);
  if (!resp) return;

  const detailContent = document.getElementById('student-detail-content');
  detailContent.innerHTML = `
    <div class="detail-header">
      <h3>${escapeHtml(resp.studentName)} <span style="font-size:14px;font-weight:normal;color:#666;">${escapeHtml(resp.studentClass)}</span></h3>
      <p style="color:#888;font-size:13px;margin-top:4px;">提交时间：${formatDateTime(resp.submittedAt)}</p>
    </div>
    <div class="detail-answers">
      ${resp.answers.map((a, i) => `
        <div class="detail-answer-item">
          <div class="detail-question">
            <span class="detail-q-num">${i + 1}</span>
            <span>${escapeHtml(a.questionText)}</span>
            <span class="detail-q-type">${a.questionType === 'choice' ? '选择题' : '开放题'}</span>
          </div>
          <div class="detail-answer">${escapeHtml(a.answer) || '<span style="color:#ccc;">未填写</span>'}</div>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('student-detail-modal').style.display = 'flex';
}

function closeStudentDetail() {
  document.getElementById('student-detail-modal').style.display = 'none';
}

async function runAnalysis() {
  document.getElementById('analysis-loading').style.display = 'flex';
  document.getElementById('analysis-result').style.display = 'none';
  document.getElementById('analysis-empty').style.display = 'none';

  try {
    const result = await apiPost('/ai/analyze', { surveyId: currentSurvey.id });
    analysisResult = result.analysis;
    renderAnalysis(result.source);
    renderClassComparison();
  } catch (e) {
    document.getElementById('analysis-loading').style.display = 'none';
    document.getElementById('analysis-empty').style.display = 'block';
    document.getElementById('analysis-empty').innerHTML = `
      <p>分析失败</p>
      <p style="font-size:14px;color:#999;margin-top:8px;">${e.message}</p>
      <button class="btn btn-primary" onclick="runAnalysis()" style="margin-top:16px;">重试</button>
    `;
  }
}

function renderAnalysis(source) {
  document.getElementById('analysis-loading').style.display = 'none';
  document.getElementById('analysis-result').style.display = 'block';

  const dims = analysisResult.dimensions;

  // 字词基础
  renderDimensionCard('basics', '字词基础', dims.basics);
  // 内容理解
  renderDimensionCard('understanding', '内容理解', dims.understanding);
  // 阅读感受
  renderDimensionCard('feeling', '阅读感受', dims.feeling);
  // 思维深度
  renderDimensionCard('thinking', '思维深度', dims.thinking);

  // 共性问题
  document.getElementById('common-problems').innerHTML = dims.commonProblems.map(p => `
    <li>${escapeHtml(p)}</li>
  `).join('');

  // 教学目标
  const goals = analysisResult.teachingGoals;
  document.getElementById('goal-basic').innerHTML = goals.basic.map(g => `<li>${escapeHtml(g)}</li>`).join('');
  document.getElementById('goal-improve').innerHTML = goals.improve.map(g => `<li>${escapeHtml(g)}</li>`).join('');
  document.getElementById('goal-expand').innerHTML = goals.expand.map(g => `<li>${escapeHtml(g)}</li>`).join('');

  // 教学建议
  document.getElementById('teaching-suggestions').innerHTML = analysisResult.suggestions
    .split('\n').filter(s => s.trim()).map(s => `<p>${escapeHtml(s)}</p>`).join('');

  // 数据来源标注
  const badge = document.createElement('span');
  badge.className = 'source-badge ' + (source === 'ai' ? 'source-ai' : 'source-local');
  badge.textContent = source === 'ai' ? '✨ AI 分析' : '📋 本地模板';
  document.querySelector('.section-title').appendChild(badge);
}

function renderDimensionCard(id, label, data) {
  const card = document.getElementById(`dim-${id}`);
  if (!card) return;

  const levelColors = {
    good: { bg: '#e8f5e9', color: '#43a047', label: '较好' },
    medium: { bg: '#fff3e0', color: '#f57c00', label: '中等' },
    weak: { bg: '#ffebee', color: '#e53935', label: '薄弱' }
  };
  const levelInfo = levelColors[data.level] || levelColors.medium;

  let detailHtml = `<p class="dim-summary">${escapeHtml(data.summary || '')}</p>`;

  if (data.keywords && data.keywords.length) {
    detailHtml += `<div class="dim-keywords">${data.keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')}</div>`;
  }
  if (data.highlights && data.highlights.length) {
    detailHtml += `<div class="dim-highlights"><strong>亮点：</strong><ul>${data.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}</ul></div>`;
  }
  if (data.quotes && data.quotes.length) {
    detailHtml += `<div class="dim-quotes"><strong>精彩回答：</strong>${data.quotes.map(q => `
      <blockquote>"${escapeHtml(q.text)}"<cite>—— ${escapeHtml(q.author)}</cite></blockquote>
    `).join('')}</div>`;
  }
  if (data.questions && data.questions.length) {
    detailHtml += `<div class="dim-questions"><strong>学生疑问：</strong><ul>${data.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul></div>`;
  }

  card.innerHTML = `
    <div class="dim-header">
      <span class="dim-label">${label}</span>
      <span class="dim-level-badge" style="background:${levelInfo.bg};color:${levelInfo.color};">${data.levelText || levelInfo.label}</span>
    </div>
    <div class="dim-score">
      <div class="score-bar">
        <div class="score-fill" style="width:${data.score || '50%'};background:${levelInfo.color};"></div>
      </div>
      <span class="score-text">${data.score || '50%'}</span>
    </div>
    <div class="dim-detail">${detailHtml}</div>
  `;
}

function renderClassComparison() {
  const section = document.getElementById('class-compare-section');
  const classes = getClasses();

  if (classes.length < 2) {
    if (section) section.style.display = 'none';
    return;
  }

  if (section) section.style.display = 'block';

  // 简单按班级计算各维度得分（模拟）
  const compareData = classes.map(cls => {
    const classResponses = responses.filter(r => r.studentClass === cls);
    const avgLength = classResponses.reduce((sum, r) => {
      const total = r.answers.filter(a => a.questionType === 'open').reduce((s, a) => s + (a.answer?.length || 0), 0);
      return sum + total;
    }, 0) / Math.max(classResponses.length, 1);

    // 基于回答长度粗略估计水平
    const score = Math.min(95, Math.round(40 + avgLength / 15));

    return { className: cls, count: classResponses.length, score };
  }).sort((a, b) => b.score - a.score);

  const container = document.getElementById('class-compare-content');
  container.innerHTML = `
    <div class="compare-chart">
      ${compareData.map((c, i) => `
        <div class="compare-bar-item">
          <div class="compare-bar-label">${escapeHtml(c.className)} <span style="font-size:12px;color:#999;">(${c.count}人)</span></div>
          <div class="compare-bar-track">
            <div class="compare-bar-fill" style="width:${c.score}%;animation-delay:${i * 0.1}s;"></div>
          </div>
          <div class="compare-bar-value">${c.score}分</div>
        </div>
      `).join('')}
    </div>
    <p style="text-align:center;color:#999;font-size:13px;margin-top:12px;">* 基于回答长度和丰富度的综合评估，仅供参考</p>
  `;
}

function exportReport() {
  const content = `
${currentSurvey.title} - 学情分析报告
${'='.repeat(40)}

生成时间：${formatDateTime(new Date())}
学生人数：${responses.length}
题目数量：${currentSurvey.questions.length}

【五维度分析】
1. 字词基础：${analysisResult.dimensions.basics.levelText} (${analysisResult.dimensions.basics.score})
   ${analysisResult.dimensions.basics.summary}

2. 内容理解：${analysisResult.dimensions.understanding.levelText} (${analysisResult.dimensions.understanding.score})
   ${analysisResult.dimensions.understanding.summary}

3. 阅读感受：${analysisResult.dimensions.feeling.levelText} (${analysisResult.dimensions.feeling.score})
   ${analysisResult.dimensions.feeling.summary}

4. 思维深度：${analysisResult.dimensions.thinking.levelText} (${analysisResult.dimensions.thinking.score})
   ${analysisResult.dimensions.thinking.summary}

5. 共性问题：
${analysisResult.dimensions.commonProblems.map((p, i) => `   ${i + 1}. ${p}`).join('\n')}

【教学目标建议】
基础目标：
${analysisResult.teachingGoals.basic.map(g => `  • ${g}`).join('\n')}

提升目标：
${analysisResult.teachingGoals.improve.map(g => `  • ${g}`).join('\n')}

拓展目标：
${analysisResult.teachingGoals.expand.map(g => `  • ${g}`).join('\n')}

【教学建议】
${analysisResult.suggestions}
  `.trim();

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentSurvey.textTitle}_学情分析报告.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ========== 工具函数 ==========

function formatDateTime(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.addEventListener('DOMContentLoaded', init);
