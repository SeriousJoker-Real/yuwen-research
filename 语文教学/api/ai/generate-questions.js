// /api/ai/generate-questions.js - AI生成调研题目
const { callCozeAI, extractJson, getLocalQuestionTemplate, handleCors } = require('../_utils');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { textTitle, textAuthor, textType, gradeLevel, textContent } = req.body;

    if (!textTitle) {
      return res.status(400).json({ error: '请提供课文标题' });
    }

    const typeNames = {
      prose: '散文', novel: '小说', poetry: '诗歌', classical: '文言文'
    };
    const gradeNames = {
      junior: '初中', senior: '高中', primary: '小学高段'
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
      "options": ["选项A", "选项B", ...]
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

    const questions = getLocalQuestionTemplate(textType, textTitle, textAuthor, gradeLevel);
    res.json({ questions, source: 'local-template' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
