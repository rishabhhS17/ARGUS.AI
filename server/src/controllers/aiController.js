const { generatePublicAdvisory } = require('../services/geminiService');

// POST /api/analyze: drafts public advisory text for the operator. Report analysis is
// no longer exposed here; it runs inside POST /api/ingest so it cannot be bypassed.
async function analyze(req, res, next) {
  try {
    const { text, taskType } = req.body || {};

    if (taskType !== 'ADVISORY') {
      return res.status(400).json({ error: 'Only ADVISORY drafts are supported here. Submit reports to /api/ingest.' });
    }

    const advisoryText = await generatePublicAdvisory(text || '');
    return res.json({ text: advisoryText });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    err.publicMessage = err.publicMessage || 'AI Analysis Failed';
    return next(err);
  }
}

module.exports = { analyze };
