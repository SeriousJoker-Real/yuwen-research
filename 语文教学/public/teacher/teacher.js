// 语文课前调研 - 教师端
// 后端API模式（Node.js服务）

const API_BASE = '/api';

// ========== API 工具函数 ==========

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

async function apiPut(path, data) {
  const res = await fetch(API_BASE + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`API错误: ${res.status}`);
  return res.json();
}

async function apiDelete(path) {
  const res = await fetch(API_BASE + path, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API错误: ${res.status}`);
  return res.json();
}

// ========== 全局状态 ==========

let currentQuestions = [];
let surveys = [];
let editingSurveyId = null;

// ========== 页面切换 ==========

function switchPage(pageId) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId + '-page').classList.add('active');

  // 更新侧边栏激活状态
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  const activeItem = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
  if (activeItem) activeItem.classList.add('active');

  // 更新标题
  const titles = {
    dashboard: '教学总览',
    surveys: '调研管理',
    create: '创建调研',
    texts: '课文库',
    classes: '班级管理'
  };
  document.querySelector('.header h1').textContent = titles[pageId] || '语文教学智能体';

  // 页面特定逻辑
  if (pageId === 'dashboard') loadDashboard();
  if (pageId === 'surveys') loadSurveyList();
  if (pageId === 'create') initCreatePage();
  if (pageId === 'classes') loadClassManagement();
}

// ========== 总览仪表盘 ==========

async function loadDashboard() {
  try {
    surveys = await apiGet('/surveys');
  } catch (e) {
    console.error('加载调研失败:', e);
    surveys = [];
  }

  // 统计数据
  const activeSurveys = surveys.filter(s => s.status === 'active').length;
  const totalResponses = surveys.reduce((sum, s) => sum + (s.responseCount || 0), 0);

  document.getElementById('stat-surveys').textContent = surveys.length;
  document.getElementById('stat-active').textContent = activeSurveys;
  document.getElementById('stat-responses').textContent = totalResponses;

  // 最近调研
  const recentList = document.getElementById('recent-surveys');
  if (surveys.length === 0) {
    recentList.innerHTML = '<div class="empty-state">暂无调研，点击左侧"创建调研"开始</div>';
    return;
  }

  recentList.innerHTML = surveys.slice(0, 5).map(s => `
    <div class="survey-card">
      <div class="survey-card-header">
        <span class="survey-title">${s.title}</span>
        <span class="badge badge-${s.status}">${s.status === 'active' ? '进行中' : s.status === 'draft' ? '草稿' : '已结束'}</span>
      </div>
      <div class="survey-card-body">
        <div class="survey-meta">
          <span>📝 ${s.questions?.length || 0} 道题</span>
          <span>📋 ${s.responseCount || 0} 份回答</span>
          <span>📅 ${formatDate(s.createdAt)}</span>
        </div>
      </div>
      <div class="survey-card-footer">
        <button class="btn btn-primary btn-sm" onclick="viewReport('${s.id}')">查看报告</button>
        <button class="btn btn-outline btn-sm" onclick="showQrCode('${s.id}')">📱 二维码</button>
        <button class="btn btn-outline btn-sm" onclick="copyStudentLink('${s.id}')">复制链接</button>
      </div>
    </div>
  `).join('');
}

// ========== 调研管理 ==========

async function loadSurveyList() {
  try {
    surveys = await apiGet('/surveys');
  } catch (e) {
    console.error('加载调研列表失败:', e);
    surveys = [];
  }

  const container = document.getElementById('survey-list');
  if (surveys.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无调研，点击右上角"新建调研"创建</div>';
    return;
  }

  container.innerHTML = surveys.map(s => `
    <div class="survey-card">
      <div class="survey-card-header">
        <div style="display:flex; align-items:center; gap:10px;">
          <span class="survey-title">${s.title}</span>
          <span class="text-type-tag type-${s.textType}">${s.textTypeName || '散文'}</span>
        </div>
        <span class="badge badge-${s.status}">${s.status === 'active' ? '进行中' : s.status === 'draft' ? '草稿' : '已结束'}</span>
      </div>
      <div class="survey-card-body">
        <div class="survey-meta">
          <span>📝 ${s.questions?.length || 0} 道题</span>
          <span>📋 ${s.responseCount || 0} 份回答</span>
          <span>🏫 ${s.classes?.length || 0} 个班级</span>
          <span>📅 ${formatDate(s.createdAt)}</span>
        </div>
      </div>
      <div class="survey-card-footer">
        <button class="btn btn-primary btn-sm" onclick="viewReport('${s.id}')">查看报告</button>
        <button class="btn btn-outline btn-sm" onclick="showQrCode('${s.id}')">📱 二维码</button>
        <button class="btn btn-outline btn-sm" onclick="copyStudentLink('${s.id}')">复制链接</button>
        ${s.status === 'draft' ? `<button class="btn btn-success btn-sm" onclick="publishSurvey('${s.id}')">发布</button>` : ''}
        ${s.status === 'active' ? `<button class="btn btn-warning btn-sm" onclick="closeSurvey('${s.id}')">结束</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteSurvey('${s.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function viewReport(surveyId) {
  window.open(`../report/?survey=${surveyId}`, '_blank');
}

function copyStudentLink(surveyId) {
  const link = `${window.location.origin}/student/?survey=${surveyId}`;
  navigator.clipboard.writeText(link).then(() => {
    showToast('学生填写链接已复制到剪贴板');
  });
}

// ========== 二维码功能 ==========

let currentQrSurveyId = null;
let qrInstance = null;
let publishQrInstance = null;

function generateQrCode(containerId, text, size) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const qr = new QRCode(container, {
    text: text,
    width: size || 200,
    height: size || 200,
    colorDark: '#2c3e50',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
  return qr;
}

function showQrCode(surveyId) {
  currentQrSurveyId = surveyId;
  const link = `${window.location.origin}/student/?survey=${surveyId}`;

  // 找到调研标题
  const survey = surveys.find(s => s.id === surveyId);
  document.getElementById('qr-modal-title').textContent = survey ? survey.title : '学生扫描二维码即可填写调研';
  document.getElementById('qr-url-text').textContent = link;

  qrInstance = generateQrCode('qr-canvas', link, 220);
  document.getElementById('qr-modal').classList.remove('hidden');
}

function closeQrModal() {
  document.getElementById('qr-modal').classList.add('hidden');
  qrInstance = null;
}

function copyQrLink() {
  if (!currentQrSurveyId) return;
  const link = `${window.location.origin}/student/?survey=${currentQrSurveyId}`;
  navigator.clipboard.writeText(link).then(() => {
    showToast('链接已复制到剪贴板');
  });
}

function downloadQrCode() {
  const canvas = document.querySelector('#qr-canvas canvas');
  if (!canvas) {
    showToast('二维码生成失败');
    return;
  }
  const link = document.createElement('a');
  link.download = `调研二维码_${currentQrSurveyId || 'survey'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// 发布弹窗里的二维码
function showPublishQr(surveyId) {
  const link = `${window.location.origin}/student/?survey=${surveyId}`;
  publishQrInstance = generateQrCode('publish-qr-canvas', link, 180);
}

async function publishSurvey(id) {
  if (!confirm('确定要发布这个调研吗？发布后学生即可填写。')) return;
  try {
    await apiPut(`/surveys/${id}`, { status: 'active' });
    showToast('调研已发布');
    loadSurveyList();
    // 显示发布成功弹窗（带二维码）
    showPublishSuccessModal(id);
  } catch (e) {
    showToast('发布失败: ' + e.message);
  }
}

function showPublishSuccessModal(surveyId) {
  const link = `${window.location.origin}/student/?survey=${surveyId}`;
  document.getElementById('survey-link').value = link;

  // 生成二维码
  showPublishQr(surveyId);

  // 显示弹窗
  document.getElementById('publish-modal').classList.remove('hidden');

  // 绑定按钮事件
  document.getElementById('copy-link-btn').onclick = () => {
    navigator.clipboard.writeText(link).then(() => showToast('链接已复制'));
  };
  document.getElementById('view-report-btn').onclick = () => {
    window.open(`../report/?survey=${surveyId}`, '_blank');
  };
  document.getElementById('close-modal-btn').onclick = () => {
    document.getElementById('publish-modal').classList.add('hidden');
  };
}

async function closeSurvey(id) {
  if (!confirm('确定要结束这个调研吗？结束后学生将无法再提交。')) return;
  try {
    await apiPut(`/surveys/${id}`, { status: 'closed' });
    showToast('调研已结束');
    loadSurveyList();
  } catch (e) {
    showToast('操作失败: ' + e.message);
  }
}

async function deleteSurvey(id) {
  if (!confirm('确定要删除这个调研吗？相关回答数据也会被删除，此操作不可恢复。')) return;
  try {
    await apiDelete(`/surveys/${id}`);
    showToast('调研已删除');
    loadSurveyList();
  } catch (e) {
    showToast('删除失败: ' + e.message);
  }
}

// ========== 创建/编辑调研 ==========

function initCreatePage() {
  currentQuestions = [
    { type: 'choice', text: '你之前读过这篇课文的作者的其他作品吗？', options: ['读过很多', '读过一两篇', '只听说过', '完全没读过'] },
    { type: 'open', text: '读完这篇课文，你觉得主要讲了什么内容？请用自己的话简要概括。' },
    { type: 'open', text: '文中哪些地方让你印象最深？请摘抄一两句并说说理由。' }
  ];
  editingSurveyId = null;
  document.getElementById('text-title').value = '';
  document.getElementById('text-author').value = '';
  document.getElementById('survey-subtitle').value = '请认真填写，帮助老师了解你的预习情况';
  document.getElementById('text-type').value = 'prose';
  document.getElementById('grade-level').value = 'senior';
  document.getElementById('survey-classes').value = '高一(1)班\n高一(2)班\n高一(3)班';
  renderQuestions();
}

function addQuestion() {
  const type = document.getElementById('new-q-type').value;
  const text = document.getElementById('new-q-text').value.trim();
  if (!text) {
    alert('请填写题目内容');
    return;
  }

  const q = { type, text };
  if (type === 'choice') {
    q.options = ['选项A', '选项B', '选项C', '选项D'];
  }
  currentQuestions.push(q);
  document.getElementById('new-q-text').value = '';
  renderQuestions();
}

function removeQuestion(index) {
  currentQuestions.splice(index, 1);
  renderQuestions();
}

function moveQuestion(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentQuestions.length) return;
  const temp = currentQuestions[index];
  currentQuestions[index] = currentQuestions[newIndex];
  currentQuestions[newIndex] = temp;
  renderQuestions();
}

function updateOption(qIndex, optIndex, value) {
  currentQuestions[qIndex].options[optIndex] = value;
}

function addOption(qIndex) {
  currentQuestions[qIndex].options.push('新选项');
  renderQuestions();
}

function removeOption(qIndex, optIndex) {
  currentQuestions[qIndex].options.splice(optIndex, 1);
  renderQuestions();
}

function renderQuestions() {
  const container = document.getElementById('questions-list');
  if (currentQuestions.length === 0) {
    container.innerHTML = '<div class="empty-state" style="margin:20px 0;">暂无题目，请在下方添加</div>';
    return;
  }

  container.innerHTML = currentQuestions.map((q, i) => `
    <div class="question-item">
      <div class="question-header">
        <span class="question-number">第 ${i + 1} 题</span>
        <span class="question-type-tag">${q.type === 'choice' ? '选择题' : '开放题'}</span>
        <div class="question-actions">
          <button class="btn-icon" onclick="moveQuestion(${i}, -1)" title="上移">↑</button>
          <button class="btn-icon" onclick="moveQuestion(${i}, 1)" title="下移">↓</button>
          <button class="btn-icon btn-danger-icon" onclick="removeQuestion(${i})" title="删除">×</button>
        </div>
      </div>
      <div class="question-text">${escapeHtml(q.text)}</div>
      ${q.type === 'choice' ? `
        <div class="options-list">
          ${q.options.map((opt, oi) => `
            <div class="option-row">
              <span class="option-label">${String.fromCharCode(65 + oi)}.</span>
              <input type="text" value="${escapeHtml(opt)}" onchange="updateOption(${i}, ${oi}, this.value)" class="option-input">
              <button class="btn-icon btn-danger-icon" onclick="removeOption(${i}, ${oi})">×</button>
            </div>
          `).join('')}
          <button class="btn btn-outline btn-sm" onclick="addOption(${i})">+ 添加选项</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// AI 生成题目
async function generateWithAI() {
  const title = document.getElementById('text-title').value.trim();
  const author = document.getElementById('text-author').value.trim();
  const textType = document.getElementById('text-type').value;
  const gradeLevel = document.getElementById('grade-level').value;

  if (!title) {
    alert('请先填写课文标题');
    return;
  }

  const btn = document.querySelector('button[onclick="generateWithAI()"]');
  const originalText = btn.textContent;
  btn.textContent = '⏳ AI出题中...';
  btn.disabled = true;

  try {
    const result = await apiPost('/ai/generate-questions', {
      textTitle: title,
      textAuthor: author,
      textType: textType,
      gradeLevel: gradeLevel
    });

    if (result.questions) {
      currentQuestions = result.questions;
      renderQuestions();
      showToast(result.source === 'ai' ? 'AI题目已生成' : '已使用模板题目（AI未配置）');
    }
  } catch (e) {
    showToast('生成失败: ' + e.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

async function saveSurvey(status) {
  const survey = collectSurveyData(status);
  if (!survey) return;

  try {
    if (editingSurveyId) {
      await apiPut(`/surveys/${editingSurveyId}`, survey);
      showToast('调研已更新');
    } else {
      await apiPost('/surveys', survey);
      showToast(status === 'active' ? '调研已发布' : '草稿已保存');
    }
    switchPage('surveys');
  } catch (e) {
    showToast('保存失败: ' + e.message);
  }
}

function collectSurveyData(status) {
  const title = document.getElementById('text-title').value.trim();
  const author = document.getElementById('text-author').value.trim();
  const textType = document.getElementById('text-type').value;
  const gradeLevel = document.getElementById('grade-level').value;
  const subtitle = document.getElementById('survey-subtitle').value.trim();
  const classesText = document.getElementById('survey-classes').value.trim();

  if (!title) {
    alert('请填写课文标题');
    return null;
  }

  if (currentQuestions.length === 0) {
    alert('请至少添加一道题目');
    return null;
  }

  const typeLabels = {
    prose: '散文',
    novel: '小说',
    poetry: '诗歌',
    classical: '文言文'
  };

  const classes = classesText.split('\n').map(c => c.trim()).filter(c => c.length > 0);

  return {
    title: `《${title}》课前调研`,
    subtitle: subtitle || '请认真填写，帮助老师了解你的预习情况',
    textTitle: title,
    textAuthor: author,
    textType: textType,
    textTypeName: typeLabels[textType],
    gradeLevel: gradeLevel,
    classes: classes.length > 0 ? classes : ['高一(1)班', '高一(2)班'],
    status,
    questions: currentQuestions.map((q, i) => ({
      id: `q${i + 1}`,
      type: q.type,
      text: q.text,
      options: q.options
    }))
  };
}

// ========== 课文库 ==========

function loadTextLibrary() {
  const texts = [
    { title: '荷塘月色', author: '朱自清', type: '散文', grade: '高中' },
    { title: '故都的秋', author: '郁达夫', type: '散文', grade: '高中' },
    { title: '拿来主义', author: '鲁迅', type: '议论文', grade: '高中' },
    { title: '劝学', author: '荀子', type: '文言文', grade: '高中' },
    { title: '念奴娇·赤壁怀古', author: '苏轼', type: '词', grade: '高中' },
    { title: '祝福', author: '鲁迅', type: '小说', grade: '高中' }
  ];

  const container = document.getElementById('texts-grid');
  container.innerHTML = texts.map(t => `
    <div class="text-card">
      <div class="text-card-header">
        <span class="text-title">《${t.title}》</span>
        <span class="text-type-tag">${t.type}</span>
      </div>
      <div class="text-card-body">
        <span>作者：${t.author}</span>
        <span>学段：${t.grade}</span>
      </div>
      <div class="text-card-footer">
        <button class="btn btn-primary btn-sm" onclick="createFromText('${t.title}', '${t.author}')">创建调研</button>
      </div>
    </div>
  `).join('');
}

function createFromText(title, author) {
  switchPage('create');
  document.getElementById('text-title').value = title;
  document.getElementById('text-author').value = author;
}

// ========== 班级管理 ==========

function loadClassManagement() {
  // 从所有调研中收集班级信息
  const allClasses = new Set();
  surveys.forEach(s => {
    if (s.classes) s.classes.forEach(c => allClasses.add(c));
  });

  const classList = Array.from(allClasses);
  const container = document.getElementById('classes-list');

  if (classList.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无班级数据，创建调研时可设置班级</div>';
    return;
  }

  container.innerHTML = classList.map((cls, i) => {
    const classSurveys = surveys.filter(s => s.classes?.includes(cls));
    const totalResponses = classSurveys.reduce((sum, s) => sum + (s.responseCount || 0), 0);

    return `
      <div class="class-card">
        <div class="class-icon">🏫</div>
        <div class="class-info">
          <h3>${cls}</h3>
          <p>参与调研 ${classSurveys.length} 次 · 提交回答 ${totalResponses} 份</p>
        </div>
        <div class="class-actions">
          <button class="btn btn-primary btn-sm" onclick="viewClassSurveys('${escapeHtml(cls)}')">查看详情</button>
        </div>
      </div>
    `;
  }).join('');
}

function viewClassSurveys(className) {
  showToast(`查看 ${className} 的调研记录（功能开发中）`);
}

// ========== 工具函数 ==========

function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ========== 初始化 ==========

window.addEventListener('DOMContentLoaded', () => {
  // 绑定侧边栏点击
  document.querySelectorAll('.sidebar-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (page) switchPage(page);
    });
  });

  // 加载仪表盘
  switchPage('dashboard');
});
