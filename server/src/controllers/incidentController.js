const Advisory = require('../../models/Advisory');
const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const { markChanged } = require('../services/changeFeed');
const { ingestReport } = require('../services/correlationService');
const { env } = require('../config/env');

// Every report is registered. It either opens a new UNCONFIRMED incident or corroborates
// an existing one nearby; it is never dropped for lack of corroboration.
async function createIncident(req, res, next) {
  try {
    const { incident, merged, distanceKm } = await ingestReport(req.body || {});
    await incident.populate('assignedUnit');

    markChanged();
    return res.json({
      success: true,
      merged,
      distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(3)),
      incident,
    });
  } catch (err) {
    return next(err);
  }
}

async function clearSystem(req, res, next) {
  try {
    const clientKey = req.headers['x-admin-key'];

    if (!env.adminKey) {
      console.warn('ADMIN_KEY is not set. Reset requests are disabled.');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    if (clientKey !== env.adminKey) {
      console.log('Unauthorized reset attempt. Invalid admin key.');
      return res.status(403).json({ error: 'Invalid Admin Key' });
    }

    await Incident.deleteMany({});
    await ForceUnit.updateMany({}, { status: 'IDLE' });
    await Advisory.deleteMany({});

    markChanged();
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { clearSystem, createIncident };
