// POST /api/surveys - 创建调研
const { readSurveys, writeSurveys, generateId, handleCors } = require('./_utils');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    // 获取单个调研
    const surveys = readSurveys();
    const { id } = req.query;
    const survey = surveys.find(s => s.id === id);
    if (!survey) return res.status(404).json({ error: '调研不存在' });
    return res.json(survey);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
