// GET /api/surveys - 获取所有调研列表
const { readSurveys, readResponses, handleCors } = require('./_utils');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const surveys = readSurveys();
    const result = surveys.map(s => ({
      ...s,
      responseCount: readResponses(s.id).length
    }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
