const Advisory = require('../../models/Advisory');
const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const { getVersion } = require('../services/changeFeed');

// Polled by every client view. `?since=<version>` returns a tiny "unchanged" reply without
// touching MongoDB when nothing has been written since the caller's last snapshot.
async function getData(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');

    // Read the version BEFORE querying: a write that lands mid-query then shows up as a
    // version mismatch on the next poll, instead of being silently skipped.
    const version = getVersion();
    if (req.query.since === version) {
      return res.json({ unchanged: true, version });
    }

    const [incidents, units, advisories] = await Promise.all([
      Incident.find().populate('assignedUnit').sort({ timestamp: -1 }).lean(),
      ForceUnit.find().lean(),
      Advisory.find().sort({ timestamp: -1 }).limit(50).lean(),
    ]);

    return res.json({ version, incidents, units, advisories });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getData };
