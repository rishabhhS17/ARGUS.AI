const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const { markChanged } = require('../services/changeFeed');

async function createUnit(req, res, next) {
  try {
    const unit = await ForceUnit.create(req.body);

    markChanged();
    return res.json(unit);
  } catch (err) {
    return next(err);
  }
}

async function deployUnit(req, res, next) {
  try {
    const { incidentId, unitId } = req.body;

    const incident = await Incident.findByIdAndUpdate(
      incidentId,
      { status: 'DISPATCHED', assignedUnit: unitId },
      { new: true },
    ).populate('assignedUnit');

    await ForceUnit.findByIdAndUpdate(unitId, { status: 'BUSY' });

    markChanged();
    return res.json({ success: true, incident });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createUnit, deployUnit };
