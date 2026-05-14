const Advisory = require('../../models/Advisory');
const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');

async function getData(req, res, next) {
  try {
    const [incidents, units, advisories] = await Promise.all([
      Incident.find().populate('assignedUnit').sort({ timestamp: -1 }).lean(),
      ForceUnit.find().lean(),
      Advisory.find().sort({ timestamp: -1 }).limit(50).lean(),
    ]);

    return res.json({ incidents, units, advisories });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getData };
