const Incident = require('../../models/Incident');
const Lead = require('../../models/Lead');
const { haversineKm, isValidCoordinates } = require('../utils/geo');
const {
  attachReportToIncident,
  isOpenCandidate,
  radiusFor,
} = require('./correlationService');

const MAX_CANDIDATES = 5;

function leadToReport(lead) {
  return {
    type: lead.type,
    category: lead.category,
    description: lead.description,
    severity: lead.severity,
    location: {
      address: lead.address,
      coordinates: isValidCoordinates(lead.coordinates) ? lead.coordinates : null,
      precision: lead.precision,
    },
    breakdown: {
      evidence_source: lead.breakdown?.evidence_source || 'Unspecified',
      acoustics: lead.breakdown?.acoustics || [],
      visual_clues: lead.breakdown?.visual_clues || [],
      logistics_needed: lead.breakdown?.logistics_needed || [],
    },
    source: lead.source,
    receivedAt: lead.receivedAt,
  };
}

// Open incidents this unplaced report may belong to: same kind of event, still active,
// and inside the lead's city/region radius when it has coordinates. Nearest first; without
// coordinates, most recently active first. These are suggestions for an operator: a vague
// report could fit several incidents, so it is never merged automatically.
function rankLeadCandidates(lead, incidents, now = new Date()) {
  const report = leadToReport(lead);
  const hasPosition = isValidCoordinates(report.location.coordinates);

  const ranked = [];
  for (const incident of incidents) {
    if (!isOpenCandidate(report, incident, now)) continue;

    const distanceKm = hasPosition
      ? haversineKm(report.location.coordinates, incident.location.coordinates)
      : null;
    if (distanceKm !== null && distanceKm > radiusFor(report.location.precision)) continue;

    ranked.push({ incident, distanceKm });
  }

  ranked.sort((a, b) => (hasPosition
    ? a.distanceKm - b.distanceKm
    : new Date(b.incident.lastReportedAt || 0) - new Date(a.incident.lastReportedAt || 0)));

  return ranked.slice(0, MAX_CANDIDATES).map(({ incident, distanceKm }) => ({
    _id: incident._id,
    type: incident.type,
    description: incident.description,
    address: incident.location.address,
    status: incident.status,
    reportCount: incident.reportCount ?? 1,
    distanceKm: distanceKm === null ? null : Number(distanceKm.toFixed(2)),
  }));
}

function createLead(report) {
  return Lead.create({
    source: report.source,
    type: report.type,
    category: report.category,
    description: report.description,
    severity: report.severity,
    address: report.location.address,
    coordinates: report.location.coordinates || [],
    precision: report.location.precision,
    breakdown: report.breakdown,
    receivedAt: report.receivedAt,
  });
}

async function findLeadCandidates(lead) {
  const incidents = await Incident.find({ status: { $ne: 'RESOLVED' } }).lean();
  return rankLeadCandidates(lead, incidents);
}

function leadError(statusCode, publicMessage) {
  const err = new Error(publicMessage);
  err.statusCode = statusCode;
  err.publicMessage = publicMessage;
  return err;
}

// Closes the lead first (only if still OPEN) so two operators cannot attach it twice;
// reopens it if the incident turns out to be gone or resolved.
async function attachLead(leadId, incidentId) {
  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, status: 'OPEN' },
    { status: 'ATTACHED', attachedIncident: incidentId, closedAt: new Date() },
    { new: true },
  );
  if (!lead) throw leadError(409, 'This report was already attached or dismissed');

  const incident = await attachReportToIncident(incidentId, leadToReport(lead));
  if (!incident) {
    await Lead.updateOne({ _id: leadId }, { status: 'OPEN', attachedIncident: null, closedAt: null });
    throw leadError(409, 'That incident no longer exists or is already resolved');
  }

  return { lead, incident };
}

async function dismissLead(leadId) {
  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, status: 'OPEN' },
    { status: 'DISMISSED', closedAt: new Date() },
    { new: true },
  );
  if (!lead) throw leadError(409, 'This report was already attached or dismissed');
  return lead;
}

module.exports = {
  attachLead,
  createLead,
  dismissLead,
  findLeadCandidates,
  leadToReport,
  rankLeadCandidates,
};
