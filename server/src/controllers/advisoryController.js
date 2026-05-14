const Advisory = require('../../models/Advisory');
const { emitAdvisoryPosted } = require('../services/realtimeService');

async function createAdvisory(req, res, next) {
  try {
    const { message } = req.body;
    const advisory = await Advisory.create({ message });

    emitAdvisoryPosted(advisory);
    return res.json({ success: true, advisory });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createAdvisory };
