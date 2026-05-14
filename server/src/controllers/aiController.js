const {
  analyzeIncidentInput,
  generatePublicAdvisory,
} = require('../services/geminiService');

async function analyze(req, res, next) {
  try {
    const { text, fileData, mimeType, taskType } = req.body;

    if (taskType === 'ADVISORY') {
      const advisoryText = await generatePublicAdvisory(text || '');
      return res.json({ text: advisoryText });
    }

    const analysis = await analyzeIncidentInput({ text, fileData, mimeType });
    return res.json(analysis);
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.publicMessage = err.publicMessage || 'AI Analysis Failed';
    return next(err);
  }
}

module.exports = { analyze };
