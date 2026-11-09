const Advisory = require('../../models/Advisory');
const { markChanged } = require('../services/changeFeed');

async function createAdvisory(req, res, next) {
  try {
    const { message } = req.body;
    const advisory = await Advisory.create({ message });

    markChanged();
    return res.json({ success: true, advisory });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createAdvisory };
