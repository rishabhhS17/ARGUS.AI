const Advisory = require('../../models/Advisory');
const ForceUnit = require('../../models/ForceUnit');
const Incident = require('../../models/Incident');
const {
  emitAdvisoriesCleared,
  emitIncidentAlert,
} = require('../services/realtimeService');
const { env } = require('../config/env');

async function createIncident(req, res, next) {
  try {
    const { type, description, severity, location, breakdown, action_plan } = req.body;

    const incident = await Incident.create({
      type,
      description,
      severity,
      location,
      breakdown,
      action_plan,
      status: 'PENDING',
      assignedUnit: null,
    });

    const incidents = await Incident.find().populate('assignedUnit').sort({ timestamp: -1 });
    const units = await ForceUnit.find();

    emitIncidentAlert({ incidents, units, newIncident: incident });
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

    const units = await ForceUnit.find();

    emitIncidentAlert({ incidents: [], units, newIncident: null });
    emitAdvisoriesCleared();

    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
}

module.exports = { clearSystem, createIncident };
