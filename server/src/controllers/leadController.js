const mongoose = require('mongoose');

const Lead = require('../../models/Lead');
const { markChanged } = require('../services/changeFeed');
const { attachLead, dismissLead, findLeadCandidates } = require('../services/leadService');

function httpError(statusCode, publicMessage) {
  const err = new Error(publicMessage);
  err.statusCode = statusCode;
  err.publicMessage = publicMessage;
  return err;
}

function assertId(value, label) {
  if (!mongoose.isValidObjectId(value)) throw httpError(400, `Invalid ${label}`);
}

// GET /api/leads/:id/candidates: incidents this unplaced report may belong to.
async function getLeadCandidates(req, res, next) {
  try {
    assertId(req.params.id, 'report id');
    const lead = await Lead.findById(req.params.id).lean();
    if (!lead) throw httpError(404, 'Report not found');
    if (lead.status !== 'OPEN') return res.json({ candidates: [] });

    return res.json({ candidates: await findLeadCandidates(lead) });
  } catch (err) {
    return next(err);
  }
}

// POST /api/leads/:id/attach { incidentId }: operator confirms which incident it belongs to.
async function attachLeadToIncident(req, res, next) {
  try {
    assertId(req.params.id, 'report id');
    assertId(req.body && req.body.incidentId, 'incident id');

    const { lead, incident } = await attachLead(req.params.id, req.body.incidentId);
    await incident.populate('assignedUnit');

    markChanged();
    return res.json({ success: true, lead, incident });
  } catch (err) {
    return next(err);
  }
}

// POST /api/leads/:id/dismiss: not actionable (duplicate, prank, already handled).
async function dismissLeadReport(req, res, next) {
  try {
    assertId(req.params.id, 'report id');
    const lead = await dismissLead(req.params.id);

    markChanged();
    return res.json({ success: true, lead });
  } catch (err) {
    return next(err);
  }
}

module.exports = { attachLeadToIncident, dismissLeadReport, getLeadCandidates };
