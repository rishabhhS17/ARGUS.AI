const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const { emitIncidentAlert, emitUnitsUpdated } = require('../services/realtimeService');

async function createUnit(req, res, next) {
  try {
    const unit = await ForceUnit.create(req.body);
    const units = await ForceUnit.find();

    emitUnitsUpdated(units);
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

    const incidents = await Incident.find().populate('assignedUnit').sort({ timestamp: -1 });
    const units = await ForceUnit.find();

    emitIncidentAlert({ incidents, units, newIncident: incident });
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createUnit, deployUnit };
