// /api/surveys/[id]/responses.js - 获取和提交学生回答
const { readResponses, writeResponses, generateId, handleCors } = require('../../_utils');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const responses = readResponses(id);
      return res.json(responses);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const responses = readResponses(id);
      const newResponse = {
        responseId: generateId('resp'),
        surveyId: id,
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

      writeResponses(id, responses);
      return res.json({ success: true, responseId: newResponse.responseId });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
