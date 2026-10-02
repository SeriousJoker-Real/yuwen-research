// 共用工具函数
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Vercel Serverless 中用 /tmp 存储数据（每次部署重置，仅作演示）
// 生产环境建议使用数据库或对象存储
const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp/data' 
  : path.resolve(__dirname, '../data');

const responsesDir = path.join(DATA_DIR, 'responses');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(responsesDir)) fs.mkdirSync(responsesDir, { recursive: true });
}

function readSurveys() {
  ensureDataDir();
  const file = path.join(DATA_DIR, 'surveys.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeSurveys(surveys) {
  ensureDataDir();
  const file = path.join(DATA_DIR, 'surveys.json');
  fs.writeFileSync(file, JSON.stringify(surveys, null, 2), 'utf-8');
}

function readResponses(surveyId) {
  ensureDataDir();
  const file = path.join(responsesDir, `${surveyId}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeResponses(surveyId, responses) {
  ensureDataDir();
  const file = path.join(responsesDir, `${surveyId}.json`);
  fs.writeFileSync(file, JSON.stringify(responses, null, 2), 'utf-8');
}

function generateId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// 扣子 AI 调用
async function callCozeAI(prompt, conversationId) {
  const apiToken = process.env.COZE_API_TOKEN;
  const botId = process.env.COZE_BOT_ID;

  if (!apiToken || !botId || apiToken === '') {
    console.warn('扣子 API 未配置，使用本地模板');
    return null;
  }

  try {
    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bot_id: botId,
        user_id: 'teacher_user',
        stream: false,
        auto_save_history: true,
        conversation_id: conversationId || undefined,
        additional_messages: [
          { role: 'user', content: prompt, content_type: 'text' }
        ]
      })
    });

    const data = await response.json();
    console.log('扣子API返回:', JSON.stringify(data).substr(0, 500));

    if (data.code === 0 && data.data && data.data.messages) {
      const answerMsg = data.data.messages.find(m => m.role === 'assistant' && m.type === 'answer');
      if (answerMsg) return answerMsg.content;
      const lastText = data.data.messages.reverse().find(m => m.content_type === 'text');
      if (lastText) return lastText.content;
    }

    console.error('扣子 API 调用失败:', data.msg || data);
    return null;
  } catch (error) {
    console.error('扣子 API 调用异常:', error.message);
    return null;
  }
}

function extractJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) {}
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) {}
  }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) {}
  }
  return null;
}

// 本地模板（备用）
function getLocalQuestionTemplate(textType, textTitle, author, gradeLevel) {
  const templates = {
    prose: [
      { id: 'q1', type: 'choice', text: `你之前读过${author || '该作者'}的其他散文吗？`, options: ['读过很多篇', '读过一两篇', '只听说过名字', '完全没听说过'] },
      { id: 'q2', type: 'open', text: `读完《${textTitle}》，你觉得这篇文章主要写了什么？请用自己的话简要概括。` },
      { id: 'q3', type: 'open', text: '文中哪些描写或句子让你印象最深？请摘抄一两句并说说理由。' },
      { id: 'q4', type: 'open', text: '读了这篇散文，你感受到作者怎样的心情或情感？你是从哪些地方看出来的？' },
      { id: 'q5', type: 'open', text: '读这篇文章时，你有什么不懂的地方或想跟老师同学探讨的问题吗？' },
      { id: 'q6', type: 'open', text: '你觉得这篇文章写得好在哪里？或者你有什么不太喜欢的地方？' }
    ],
    novel: [
      { id: 'q1', type: 'choice', text: `你之前读过${author || '该作者'}的其他小说吗？`, options: ['读过很多篇', '读过一两篇', '只听说过名字', '完全没听说过'] },
      { id: 'q2', type: 'open', text: `请用几句话概括《${textTitle}》的故事情节。` },
      { id: 'q3', type: 'open', text: '小说中哪个人物给你留下的印象最深？为什么？' },
      { id: 'q4', type: 'open', text: '你觉得故事发生的环境是怎样的？环境描写在文中有什么作用？' },
      { id: 'q5', type: 'open', text: '读完小说，你有什么疑问或想深入讨论的问题吗？' },
      { id: 'q6', type: 'open', text: '你觉得这篇小说想表达什么主题？说说你的理解。' }
    ],
    poetry: [
      { id: 'q1', type: 'choice', text: `你之前读过${author || '该诗人'}的其他诗吗？`, options: ['读过很多首', '读过一两首', '只听说过名字', '完全没听说过'] },
      { id: 'q2', type: 'open', text: `读了《${textTitle}》，你的脑海中浮现出了怎样的画面？请描述一下。` },
      { id: 'q3', type: 'open', text: '诗中哪些词语或句子你觉得用得特别好？好在哪里？' },
      { id: 'q4', type: 'open', text: '你觉得这首诗表达了诗人怎样的情感？' },
      { id: 'q5', type: 'open', text: '读这首诗时，你有什么不理解的地方或想跟同学讨论的问题吗？' },
      { id: 'q6', type: 'open', text: '你愿意试着仿写一句或一段吗？（选答）' }
    ],
    classical: [
      { id: 'q1', type: 'choice', text: '你预习文言文时，通常会借助什么工具？', options: ['借助注释就能读懂', '查古汉语字典/词典', '用翻译APP/网站', '基本读不懂'] },
      { id: 'q2', type: 'open', text: `读了《${textTitle}》，你能用自己的话说说文章大概讲了什么内容吗？` },
      { id: 'q3', type: 'open', text: '预习中你遇到了哪些不懂的字词或句子？请写出来。' },
      { id: 'q4', type: 'open', text: '你觉得这篇文章主要想表达什么意思或道理？' },
      { id: 'q5', type: 'open', text: '文中哪个人物或哪件事让你印象比较深？为什么？' },
      { id: 'q6', type: 'open', text: '关于这篇文言文，你有什么想跟老师同学一起探讨的问题吗？' }
    ]
  };
  return templates[textType] || templates.prose;
}

// CORS 处理
function handleCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = {
  readSurveys,
  writeSurveys,
  readResponses,
  writeResponses,
  generateId,
  callCozeAI,
  extractJson,
  getLocalQuestionTemplate,
  handleCors,
  ensureDataDir
};
