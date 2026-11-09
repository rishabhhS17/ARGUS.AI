const mongoose = require('mongoose');

const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const { markChanged } = require('../services/changeFeed');
const { rankNearestUnits } = require('../services/dispatchService');

function httpError(statusCode, publicMessage) {
  const err = new Error(publicMessage);
  err.statusCode = statusCode;
  err.publicMessage = publicMessage;
  return err;
}

async function createUnit(req, res, next) {
  try {
    const unit = await ForceUnit.create(req.body);

    markChanged();
    return res.json(unit);
  } catch (err) {
    return next(err);
  }
}

// GET /api/incidents/:id/suggestions: nearest idle unit per type, ranked on the server.
async function getDispatchSuggestions(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid incident id');

    const incident = await Incident.findById(req.params.id).lean();
    if (!incident) throw httpError(404, 'Incident not found');
    if (incident.status !== 'PENDING') return res.json({ suggestions: [] });

    const idleUnits = await ForceUnit.find({ status: 'IDLE' }).lean();
    return res.json({ suggestions: rankNearestUnits(incident.location.coordinates, idleUnits) });
  } catch (err) {
    return next(err);
  }
}

// Each step is a conditional update, so two operators clicking at once cannot deploy a
// busy unit or dispatch the same incident twice.
async function deployUnit(req, res, next) {
  try {
    const { incidentId, unitId } = req.body || {};
    if (!mongoose.isValidObjectId(incidentId) || !mongoose.isValidObjectId(unitId)) {
      throw httpError(400, 'incidentId and unitId are required');
    }

    const unit = await ForceUnit.findOneAndUpdate(
      { _id: unitId, status: 'IDLE' },
      { status: 'BUSY' },
      { new: true },
    );
    if (!unit) throw httpError(409, 'That unit is no longer available');

    const incident = await Incident.findOneAndUpdate(
      { _id: incidentId, status: 'PENDING' },
      { status: 'DISPATCHED', assignedUnit: unit._id },
      { new: true },
    ).populate('assignedUnit');

    if (!incident) {
      // Release the reservation: the incident is gone, resolved, or already dispatched.
      await ForceUnit.updateOne({ _id: unit._id, status: 'BUSY' }, { status: 'IDLE' });
      throw httpError(409, 'This incident is already dispatched or resolved');
    }

    markChanged();
    return res.json({ success: true, incident });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createUnit, deployUnit, getDispatchSuggestions };
