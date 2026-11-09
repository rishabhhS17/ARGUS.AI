const mongoose = require('mongoose');

const Advisory = require('../../models/Advisory');
const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const { markChanged } = require('../services/changeFeed');
const { ingestReport } = require('../services/correlationService');
const { analyzeIncidentInput } = require('../services/geminiService');
const { env } = require('../config/env');

function httpError(statusCode, publicMessage) {
  const err = new Error(publicMessage);
  err.statusCode = statusCode;
  err.publicMessage = publicMessage;
  return err;
}

// POST /api/ingest: the only way a citizen report becomes an incident. The server runs
// the whole pipeline (Gemini analysis -> validation -> correlation) so a client cannot
// skip the AI step and post a fabricated incident record.
async function ingestIncident(req, res, next) {
  try {
    const { text, fileData, mimeType, source } = req.body || {};
    const hasText = typeof text === 'string' && text.trim().length > 0;
    const hasFile = typeof fileData === 'string' && fileData.length > 0;
    if (!hasText && !hasFile) throw httpError(400, 'A report needs text, an image, or audio.');

    // Throws 422 when the report does not say what happened and where.
    const analysis = await analyzeIncidentInput({
      text: hasText ? text : undefined,
      fileData: hasFile ? fileData : undefined,
      mimeType,
    });

    const description = source === 'HELPLINE'
      ? `[VOICE CALL] ${analysis.description}`
      : analysis.description;

    // Every valid report is registered: it opens a new UNCONFIRMED incident or
    // corroborates an existing one nearby. It is never dropped for lack of corroboration.
    const { incident, merged, distanceKm } = await ingestReport({ ...analysis, description, source });
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

// POST /api/resolve: closes an incident and frees its unit. Resolved incidents stop
// accepting new reports, so a later event at the same spot opens a fresh incident.
async function resolveIncident(req, res, next) {
  try {
    const { incidentId } = req.body || {};
    if (!mongoose.isValidObjectId(incidentId)) throw httpError(400, 'incidentId is required');

    const incident = await Incident.findOneAndUpdate(
      { _id: incidentId, status: { $ne: 'RESOLVED' } },
      { status: 'RESOLVED', resolvedAt: new Date() },
      { new: true },
    );

    if (!incident) {
      const exists = await Incident.exists({ _id: incidentId });
      throw exists ? httpError(409, 'Incident is already resolved') : httpError(404, 'Incident not found');
    }

    if (incident.assignedUnit) {
      await ForceUnit.updateOne({ _id: incident.assignedUnit, status: 'BUSY' }, { status: 'IDLE' });
    }
    await incident.populate('assignedUnit');

    markChanged();
    return res.json({ success: true, incident });
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

module.exports = { clearSystem, ingestIncident, resolveIncident };
