/**
 * 语文课前调研智能体 - 后端服务
 * 功能：静态文件服务 + REST API + 扣子智能体对接
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;
const DATA_DIR = path.resolve(__dirname, process.env.DATA_DIR || '../data');

// 确保数据目录存在
const responsesDir = path.join(DATA_DIR, 'responses');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(responsesDir)) fs.mkdirSync(responsesDir, { recursive: true });

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务
const publicDir = path.resolve(__dirname, '../public');
app.use('/', express.static(publicDir));

// ========== 数据工具函数 ==========

function readSurveys() {
  const file = path.join(DATA_DIR, 'surveys.json');
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeSurveys(surveys) {
  const file = path.join(DATA_DIR, 'surveys.json');
  fs.writeFileSync(file, JSON.stringify(surveys, null, 2), 'utf-8');
}

function readResponses(surveyId) {
  const file = path.join(responsesDir, `${surveyId}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeResponses(surveyId, responses) {
  const file = path.join(responsesDir, `${surveyId}.json`);
  fs.writeFileSync(file, JSON.stringify(responses, null, 2), 'utf-8');
}

function generateId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

// ========== 扣子智能体 API ==========

const COZE_API_URL = 'https://api.coze.cn/v3/chat';

/**
 * 调用扣子智能体对话
 * @param {string} prompt - 用户提问
 * @param {string} conversationId - 会话ID（可选）
 * @returns {Promise<string>} - AI回复文本
 */
async function callCozeAI(prompt, conversationId) {
  const apiToken = process.env.COZE_API_TOKEN;
  const botId = process.env.COZE_BOT_ID;

  if (!apiToken || !botId || apiToken === '') {
    console.warn('扣子 API 未配置，使用模拟数据');
    return null; // 返回null表示使用模拟数据
  }

  try {
    const response = await fetch(COZE_API_URL, {
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
          {
            role: 'user',
            content: prompt,
            content_type: 'text'
          }
        ]
      })
    });

    const data = await response.json();
    console.log('扣子API返回:', JSON.stringify(data).substr(0, 500));

    if (data.code === 0 && data.data && data.data.messages) {
      // 找到assistant的回答
      const answerMsg = data.data.messages.find(m => m.role === 'assistant' && m.type === 'answer');
      if (answerMsg) {
        return answerMsg.content;
      }
      // 如果有多个消息，取最后一个文本内容
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

/**
 * 从AI回复中提取JSON
 */
function extractJson(text) {
  if (!text) return null;

  // 先尝试直接解析
  try {
    return JSON.parse(text);
  } catch (e) {}

  // 再尝试从代码块中提取
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {}
  }

  // 最后尝试提取第一个JSON对象
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {}
  }

  return null;
}

// ========== 调研管理 API ==========

// 获取所有调研
app.get('/api/surveys', (req, res) => {
  const surveys = readSurveys();
  // 附加回答数量
  const result = surveys.map(s => ({
    ...s,
    responseCount: readResponses(s.id).length
  }));
  res.json(result);
});

// 获取单个调研
app.get('/api/surveys/:id', (req, res) => {
  const surveys = readSurveys();
  const survey = surveys.find(s => s.id === req.params.id);
  if (!survey) return res.status(404).json({ error: '调研不存在' });
  res.json(survey);
});

// 创建调研
app.post('/api/surveys', (req, res) => {
  const surveys = readSurveys();
  const newSurvey = {
    id: generateId('survey'),
    createdAt: new Date().toISOString(),
    status: 'draft',
    ...req.body
  };
  surveys.unshift(newSurvey);
  writeSurveys(surveys);
  res.json(newSurvey);
});

// 更新调研
app.put('/api/surveys/:id', (req, res) => {
  const surveys = readSurveys();
  const index = surveys.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: '调研不存在' });
  surveys[index] = { ...surveys[index], ...req.body, id: req.params.id };
  writeSurveys(surveys);
  res.json(surveys[index]);
});

// 删除调研
app.delete('/api/surveys/:id', (req, res) => {
  const surveys = readSurveys();
  const filtered = surveys.filter(s => s.id !== req.params.id);
  if (filtered.length === surveys.length) return res.status(404).json({ error: '调研不存在' });
  writeSurveys(filtered);
  // 同时删除回答文件
  const respFile = path.join(responsesDir, `${req.params.id}.json`);
  if (fs.existsSync(respFile)) fs.unlinkSync(respFile);
  res.json({ success: true });
});

// ========== 学生回答 API ==========

// 获取调研的所有回答
app.get('/api/surveys/:id/responses', (req, res) => {
  const responses = readResponses(req.params.id);
  res.json(responses);
});

// 提交学生回答
app.post('/api/surveys/:id/responses', (req, res) => {
  const surveys = readSurveys();
  const survey = surveys.find(s => s.id === req.params.id);
  if (!survey) return res.status(404).json({ error: '调研不存在' });

  const responses = readResponses(req.params.id);
  const newResponse = {
    responseId: generateId('resp'),
    surveyId: req.params.id,
    submittedAt: new Date().toISOString(),
    ...req.body
  };

  // 同名同班覆盖
  const existingIndex = responses.findIndex(
    r => r.studentName === newResponse.studentName && r.studentClass === newResponse.studentClass
  );
  if (existingIndex >= 0) {
    responses[existingIndex] = { ...responses[existingIndex], ...newResponse };
  } else {
    responses.push(newResponse);
  }

  writeResponses(req.params.id, responses);
  res.json({ success: true, responseId: newResponse.responseId });
});

// ========== AI API ==========

// AI生成调研题目
app.post('/api/ai/generate-questions', async (req, res) => {
  const { textTitle, textAuthor, textType, gradeLevel, textContent } = req.body;

  if (!textTitle) {
    return res.status(400).json({ error: '请提供课文标题' });
  }

  const typeNames = {
    prose: '散文',
    novel: '小说',
    poetry: '诗歌',
    classical: '文言文'
  };
  const gradeNames = {
    junior: '初中',
    senior: '高中',
    primary: '小学高段'
  };

  const prompt = `
请为${gradeNames[gradeLevel] || '高中'}语文课文《${textTitle}》（作者：${textAuthor || '佚名'}，文体：${typeNames[textType] || '散文'}）设计一份课前调研问卷。

要求：
1. 共4-6道题，以开放问答题为主，可加1-2道选择题
2. 题目要围绕课前预习的目标，了解学生的预习情况
3. 覆盖以下维度：基础字词/内容理解/阅读感受/疑问与思考
4. 题目表述要贴近学生，容易理解和回答

请直接返回JSON格式的调研配置：
{
  "questions": [
    {
      "id": "q1",
      "type": "choice" | "open",
      "text": "题目内容",
      "options": ["选项A", "选项B", ...]  // 仅选择题需要
    }
  ]
}

${textContent ? `课文原文：\n${textContent.substring(0, 3000)}` : ''}
`.trim();

  const aiResponse = await callCozeAI(prompt);

  if (aiResponse) {
    const jsonResult = extractJson(aiResponse);
    if (jsonResult && jsonResult.questions) {
      return res.json({ questions: jsonResult.questions, source: 'ai' });
    }
  }

  // AI调用失败或未配置时，使用本地模板
  const questions = getLocalQuestionTemplate(textType, textTitle, textAuthor, gradeLevel);
  res.json({ questions, source: 'local-template' });
});

// AI分析学生回答
app.post('/api/ai/analyze', async (req, res) => {
  const { surveyId } = req.body;

  if (!surveyId) {
    return res.status(400).json({ error: '请提供调研ID' });
  }

  const surveys = readSurveys();
  const survey = surveys.find(s => s.id === surveyId);
  if (!survey) return res.status(404).json({ error: '调研不存在' });

  const responses = readResponses(surveyId);
  if (responses.length === 0) {
    return res.status(400).json({ error: '暂无学生回答数据' });
  }

  // 构建prompt
  const answersText = responses.map((r, i) => {
    const answerStr = r.answers.map(a => `
  第${i + 1}号学生（${r.studentClass} ${r.studentName}）：
  ${a.questionText}
  回答：${a.answer}
`).join('');
    return answerStr;
  }).join('\n');

  const typeNames = {
    prose: '散文',
    novel: '小说',
    poetry: '诗歌',
    classical: '文言文'
  };

  const prompt = `
你是一位资深语文教研专家。请根据以下学生的课前调研回答，进行多维度学情分析，并生成教学目标建议。

【课文信息】
标题：${survey.textTitle}
作者：${survey.textAuthor || '佚名'}
文体：${typeNames[survey.textType] || '散文'}

【调研题目】
${survey.questions.map((q, i) => `${i + 1}. ${q.text}（${q.type === 'choice' ? '选择题' : '开放题'}）`).join('\n')}

【学生回答】
${answersText}

【分析要求】
请从以下五大维度进行分析，并返回严格的JSON格式：

{
  "dimensions": {
    "basics": {
      "level": "good|medium|weak",
      "levelText": "较好|中等|薄弱",
      "score": "百分比数字",
      "summary": "整体分析总结（100字左右）",
      "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"]
    },
    "understanding": {
      "level": "good|medium|weak",
      "levelText": "...",
      "score": "...",
      "summary": "...",
      "highlights": ["亮点1", "亮点2", "亮点3"]
    },
    "feeling": {
      "level": "good|medium|weak",
      "levelText": "...",
      "score": "...",
      "summary": "...",
      "quotes": [
        { "text": "学生原话摘录", "author": "学生姓名" }
      ]
    },
    "thinking": {
      "level": "good|medium|weak",
      "levelText": "...",
      "score": "...",
      "summary": "...",
      "questions": ["学生疑问1", "学生疑问2", "学生疑问3"]
    },
    "commonProblems": ["共性问题1", "共性问题2", "共性问题3"]
  },
  "teachingGoals": {
    "basic": ["基础目标1", "基础目标2", "基础目标3"],
    "improve": ["提升目标1", "提升目标2", "提升目标3"],
    "expand": ["拓展目标1", "拓展目标2", "拓展目标3"]
  },
  "suggestions": "教学重点和建议的详细文字说明（300-500字，分段阐述）"
}

请务必只返回JSON，不要有其他文字。
`.trim();

  const aiResponse = await callCozeAI(prompt);

  if (aiResponse) {
    const jsonResult = extractJson(aiResponse);
    if (jsonResult && jsonResult.dimensions) {
      return res.json({ analysis: jsonResult, source: 'ai' });
    }
    console.warn('AI返回内容无法解析为JSON，使用本地模拟数据');
  }

  // AI调用失败时，使用本地模拟数据
  const mockAnalysis = getMockAnalysis(responses, survey);
  res.json({ analysis: mockAnalysis, source: 'local-mock' });
});

// ========== 本地模板（备用） ==========

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

function getMockAnalysis(responses, survey) {
  const textType = survey.textType || 'prose';
  // 简单的词频统计
  const allTexts = responses.flatMap(r => r.answers.map(a => a.answer)).join(' ');
  const words = allTexts.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const wordCount = {};
  words.forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
  const topWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  const base = {
    dimensions: {
      basics: { level: 'medium', levelText: '中等', score: '65%', summary: '学生对字词有基本掌握，但部分关键词语的深层理解有待加强。', keywords: topWords.slice(0, 5) },
      understanding: { level: 'good', levelText: '较好', score: '75%', summary: '学生对课文主要内容把握较好，多数能概括大意。', highlights: ['对主要内容有较好把握', '部分学生注意到了写作手法', '对关键场景印象深刻'] },
      feeling: { level: 'good', levelText: '较好', score: '78%', summary: '学生与文本有较好的情感联结，能表达阅读感受。', quotes: responses.slice(0, 2).map(r => ({ text: r.answers[2]?.answer?.substring(0, 50) + '...', author: r.studentName })) },
      thinking: { level: 'medium', levelText: '中等', score: '60%', summary: '学生思维深度存在差异，部分学生能提出有质量的问题。', questions: ['关于写作背景的疑问', '关于深层含义的疑问', '关于写作手法的疑问'] },
      commonProblems: ['对写作手法的赏析能力不足', '对深层含义理解较浅', '概括能力有待提高']
    },
    teachingGoals: {
      basic: ['掌握重点字词', '概括主要内容', '了解作者背景'],
      improve: ['学习写作手法', '理解思想感情', '体会语言之美'],
      expand: ['深入探究主题', '比较阅读', '迁移运用']
    },
    suggestions: '根据调研结果，建议本节课重点关注学生的薄弱环节，从基础入手，逐步深入。'
  };
  return base;
}

// ========== 初始化演示数据 ==========

function initDemoData() {
  const surveys = readSurveys();
  if (surveys.length > 0) return;

  const demoSurvey = {
    id: 'demo-001',
    title: '《荷塘月色》课前调研',
    subtitle: '请认真填写，帮助老师了解你的预习情况',
    textTitle: '荷塘月色',
    textAuthor: '朱自清',
    textType: 'prose',
    textTypeName: '散文',
    gradeLevel: 'senior',
    classes: ['高一(1)班', '高一(2)班', '高一(3)班', '高一(4)班'],
    status: 'active',
    createdAt: new Date().toISOString(),
    questions: [
      { id: 'q1', type: 'choice', text: '你之前读过朱自清的其他散文吗？', options: ['读过很多篇', '读过一两篇', '只听说过名字', '完全没听说过'] },
      { id: 'q2', type: 'open', text: '读完《荷塘月色》，你觉得这篇文章主要写了什么？请用自己的话简要概括。' },
      { id: 'q3', type: 'open', text: '文中哪些描写或句子让你印象最深？请摘抄一两句并说说理由。' },
      { id: 'q4', type: 'open', text: '读了这篇散文，你感受到作者怎样的心情或情感？你是从哪些地方看出来的？' },
      { id: 'q5', type: 'open', text: '读这篇文章时，你有什么不懂的地方或想跟老师同学探讨的问题吗？' },
      { id: 'q6', type: 'open', text: '你觉得这篇文章写得好在哪里？或者你有什么不太喜欢的地方？' }
    ]
  };

  writeSurveys([demoSurvey]);

  // 示例回答
  const demoResponses = [
    { responseId: 'r1', surveyId: 'demo-001', studentName: '张小明', studentClass: '高一(1)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', questionText: '你之前读过朱自清的其他散文吗？', answer: '读过一两篇' },
        { questionId: 'q2', questionType: 'open', questionText: '读完《荷塘月色》...', answer: '这篇文章主要讲了作者晚上去荷塘边散步，看到了美丽的荷塘月色景色，心情从不宁静变得稍微平静了一些。' },
        { questionId: 'q3', questionType: 'open', questionText: '文中哪些描写...', answer: '"曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。"这句话写得特别美，把荷叶比作舞女的裙子，很有画面感。' },
        { questionId: 'q4', questionType: 'open', questionText: '你感受到作者怎样的心情...', answer: '我觉得作者一开始心情不好，后来看到荷塘月色的美景后心情好了一些，但好像还是有些烦恼。' },
        { questionId: 'q5', questionType: 'open', questionText: '有什么不懂的地方...', answer: '我不太明白作者为什么一开始说"心里颇不宁静"，发生了什么事？还有最后为什么要想到采莲的事情？' },
        { questionId: 'q6', questionType: 'open', questionText: '你觉得这篇文章写得好在哪里...', answer: '写得很好，景色描写特别美，读着就像在看一幅画。就是有些地方不太懂。' }
      ]
    },
    { responseId: 'r2', surveyId: 'demo-001', studentName: '李小红', studentClass: '高一(1)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '只听说过名字' },
        { questionId: 'q2', questionType: 'open', answer: '作者晚上去看荷塘，写了荷塘的景色很美。' },
        { questionId: 'q3', questionType: 'open', answer: '"月光如流水一般，静静地泻在这一片叶子和花上。"月光像流水一样，这个比喻很特别。' },
        { questionId: 'q4', questionType: 'open', answer: '作者的心情好像比较平静，但又有点孤独。' },
        { questionId: 'q5', questionType: 'open', answer: '"这时候最热闹的，要数树上的蝉声与水里的蛙声；但热闹是它们的，我什么也没有。"这句话是什么意思？' },
        { questionId: 'q6', questionType: 'open', answer: '语言很美，但是有些难理解。' }
      ]
    },
    { responseId: 'r3', surveyId: 'demo-001', studentName: '王大伟', studentClass: '高一(2)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '读过一两篇' },
        { questionId: 'q2', questionType: 'open', answer: '文章写了作者在一个月夜去荷塘散步的经历，描写了荷塘上的月色和周围的景色，同时表达了作者内心的不宁静和对自由的向往。' },
        { questionId: 'q3', questionType: 'open', answer: '我最喜欢描写荷塘月色的那一段，把荷叶、荷花、月光都写得非常细腻，让人仿佛身临其境。特别是"微风过处，送来缕缕清香"这个嗅觉描写，很有代入感。' },
        { questionId: 'q4', questionType: 'open', answer: '作者内心是矛盾的，既有对现实的不满，又想通过欣赏自然美景来排遣。他虽然被荷塘月色暂时吸引，但内心的烦恼并没有真正消失。' },
        { questionId: 'q5', questionType: 'open', answer: '1. 为什么作者要用大量篇幅写荷塘景色，和他"不宁静"的心情有什么关系？ 2. 文章的写作背景是什么？ 3. "采莲赋"那段有什么作用？' },
        { questionId: 'q6', questionType: 'open', answer: '情景交融写得特别好，景中有情，情中有景。语言也很有特色，清新自然。' }
      ]
    },
    { responseId: 'r4', surveyId: 'demo-001', studentName: '陈思雨', studentClass: '高一(3)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '读过很多篇' },
        { questionId: 'q2', questionType: 'open', answer: '这篇散文以"心里颇不宁静"为开头，写作者夜游荷塘的所见所感。通过对荷塘月色的细腻描写，表达了作者对现实的不满和对自由宁静生活的向往，最后又回到现实的无奈中。' },
        { questionId: 'q3', questionType: 'open', answer: '"曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。"一连串的比喻非常精彩，把静态的荷叶写活了。还有"月光如流水一般，静静地泻在这一片叶子和花上"的"泻"字用得特别妙。' },
        { questionId: 'q4', questionType: 'open', answer: '作者的心情经历了"不宁静—寻求宁静—暂时宁静—重归不宁静"的变化过程。荷塘月色是他暂时逃避现实的地方，但最终还是要回到现实中。' },
        { questionId: 'q5', questionType: 'open', answer: '1. 文章的时代背景对理解作者心情有多重要？ 2. 为什么作者想起的是江南的采莲，而不是别的？ 3. 本文的"文眼"是什么？' },
        { questionId: 'q6', questionType: 'open', answer: '朱自清的散文语言非常有特色，清新典雅又不失自然。特别是通感手法的运用，让人耳目一新。' }
      ]
    },
    { responseId: 'r5', surveyId: 'demo-001', studentName: '赵子涵', studentClass: '高一(3)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '读过一两篇' },
        { questionId: 'q2', questionType: 'open', answer: '作者晚上去荷塘散步，看到了美丽的荷塘景色，心情好了一些，但后来又不好了。' },
        { questionId: 'q3', questionType: 'open', answer: '描写荷花的那几句写得特别美，"袅娜""羞涩"把花写得像人一样。' },
        { questionId: 'q4', questionType: 'open', answer: '作者一开始心情不好，后来看到美景心情好了。' },
        { questionId: 'q5', questionType: 'open', answer: '"梵婀玲"是什么？还有"蓊蓊郁郁"怎么读？' },
        { questionId: 'q6', questionType: 'open', answer: '景色描写很美，但是有些地方读不太懂。' }
      ]
    }
  ];

  writeResponses('demo-001', demoResponses);
  console.log('✅ 演示数据已初始化');
}

// ========== 启动服务 ==========

initDemoData();

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 语文课前调研智能体服务已启动');
  console.log('');
  console.log(`📡 服务地址: http://localhost:${PORT}`);
  console.log('');
  console.log('📱 页面入口:');
  console.log(`   首页:     http://localhost:${PORT}/`);
  console.log(`   教师端:   http://localhost:${PORT}/teacher/`);
  console.log(`   学生端:   http://localhost:${PORT}/student/?survey=demo-001`);
  console.log(`   报告页:   http://localhost:${PORT}/report/?survey=demo-001`);
  console.log('');
  const apiConfigured = process.env.COZE_API_TOKEN && process.env.COZE_API_TOKEN !== '';
  console.log(`🤖 AI状态: ${apiConfigured ? '已配置（扣子API）' : '未配置（使用本地模板）'}`);
  if (!apiConfigured) {
    console.log('   配置方法：编辑 server/.env 文件，填入 COZE_API_TOKEN 和 COZE_BOT_ID');
  }
  console.log('');
  console.log('📂 数据目录: ' + DATA_DIR);
  console.log('');
});
