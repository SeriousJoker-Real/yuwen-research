// /api/surveys/[id]/index.js - 单个调研的查询/更新/删除
const fs = require('fs');
const path = require('path');
const { readSurveys, writeSurveys, handleCors, ensureDataDir } = require('../../_utils');

const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp/data' 
  : path.resolve(__dirname, '../../../data');

const responsesDir = path.join(DATA_DIR, 'responses');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  ensureDataDir();

  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const surveys = readSurveys();
      const survey = surveys.find(s => s.id === id);
      if (!survey) return res.status(404).json({ error: '调研不存在' });
      return res.json(survey);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const surveys = readSurveys();
      const index = surveys.findIndex(s => s.id === id);
      if (index === -1) return res.status(404).json({ error: '调研不存在' });
      surveys[index] = { ...surveys[index], ...req.body, id };
      writeSurveys(surveys);
      return res.json(surveys[index]);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const surveys = readSurveys();
      const filtered = surveys.filter(s => s.id !== id);
      if (filtered.length === surveys.length) return res.status(404).json({ error: '调研不存在' });
      writeSurveys(filtered);
      // 同时删除回答文件
      const respFile = path.join(responsesDir, `${id}.json`);
      if (fs.existsSync(respFile)) fs.unlinkSync(respFile);
      return res.json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
