// /api/ai/analyze.js - AI分析学生回答
const { readSurveys, readResponses, callCozeAI, extractJson, handleCors } = require('../_utils');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      return r.answers.map(a => `
第${i + 1}号学生（${r.studentClass} ${r.studentName}）：
${a.questionText}
回答：${a.answer}
`).join('');
    }).join('\n');

    const typeNames = {
      prose: '散文', novel: '小说', poetry: '诗歌', classical: '文言文'
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

    // 本地模拟数据
    const allTexts = responses.flatMap(r => r.answers.map(a => a.answer)).join(' ');
    const words = allTexts.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const wordCount = {};
    words.forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    const mockAnalysis = {
      dimensions: {
        basics: { level: 'medium', levelText: '中等', score: '65%', summary: '学生对字词有基本掌握，但部分关键词语的深层理解有待加强。', keywords: topWords.slice(0, 5) },
        understanding: { level: 'good', levelText: '较好', score: '75%', summary: '学生对课文主要内容把握较好，多数能概括大意。', highlights: ['对主要内容有较好把握', '部分学生注意到了写作手法', '对关键场景印象深刻'] },
        feeling: { level: 'good', levelText: '较好', score: '78%', summary: '学生与文本有较好的情感联结，能表达阅读感受。', quotes: responses.slice(0, 2).map(r => ({ text: (r.answers[2]?.answer || '').substring(0, 50) + '...', author: r.studentName })) },
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

    res.json({ analysis: mockAnalysis, source: 'local-mock' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
