const Incident = require('../../models/Incident');
const { haversineKm, isValidCoordinates } = require('../utils/geo');
const { assertReportable, sanitizeIncidentAnalysis } = require('../utils/aiResponseParser');

// Gemini's coordinates are estimates from free text, so two witnesses of the same fire can
// be placed several hundred metres apart. 1.5 km catches that without merging neighbourhoods.
const CORRELATION_RADIUS_KM = 1.5;
// How long an incident stays open to new reports is driven by its lifecycle, not a fixed
// clock: it accepts corroboration until an operator marks it RESOLVED. The quiet period
// below is only a safety net for incidents nobody resolved. It is measured from the
// LATEST report (a sliding window), so an event people keep reporting stays open, and it
// depends on how long that kind of event realistically keeps producing reports.
const HOUR_MS = 60 * 60 * 1000;
const QUIET_PERIOD_MS_BY_CATEGORY = {
  NATURAL_DISASTER: 24 * HOUR_MS, // floods, quakes: reports trickle in over a day
  FIRE: 6 * HOUR_MS,              // burns, smoulders, gets re-reported for hours
  HAZMAT: 6 * HOUR_MS,            // leaks and spills linger until contained
  CRIME: 3 * HOUR_MS,             // riots and standoffs can run for hours
  ACCIDENT: 2 * HOUR_MS,          // cleared within a couple of hours
  MEDICAL: 1 * HOUR_MS,           // a single, short emergency
  OTHER: 2 * HOUR_MS,
};
const MAX_QUIET_PERIOD_MS = Math.max(...Object.values(QUIET_PERIOD_MS_BY_CATEGORY));

function quietPeriodFor(category) {
  return QUIET_PERIOD_MS_BY_CATEGORY[category] || QUIET_PERIOD_MS_BY_CATEGORY.OTHER;
}
const MAX_STORED_REPORTS = 50;
const VALID_SOURCES = new Set(['SOCIAL', 'HELPLINE']);

// Ordered: the first matching category wins ("car fire" is FIRE, "road accident with injuries" is ACCIDENT).
const CATEGORY_RULES = [
  ['FIRE', /\b(fire|smoke|smoking|blaze|burn\w*|flame\w*|explo\w*|arson)\b/],
  ['HAZMAT', /\b(gas leak|chemical|hazmat|toxic|spill\w*|leak\w*)\b/],
  ['ACCIDENT', /\b(accident|crash\w*|collision|collided|traffic|pile-?up|derail\w*)\b/],
  ['CRIME', /\b(crime|robbery|robbed|theft|stolen|assault\w*|shoot\w*|shot|gun\w*|stab\w*|violen\w*|riot\w*|fight\w*|attack\w*|burglar\w*|kidnap\w*|weapon\w*|armed|mob)\b/],
  ['NATURAL_DISASTER', /\b(flood\w*|earthquake|landslide|storm|cyclone|tsunami|waterlog\w*|collapse\w*)\b/],
  ['MEDICAL', /\b(medical|injur\w*|heart|cardiac|unconscious|faint\w*|ambulance|stroke|overdose|bleed\w*|seizure|breathing)\b/],
];

function classifyCategory(type, description) {
  for (const text of [type, description]) {
    const haystack = String(text || '').toLowerCase();
    const rule = CATEGORY_RULES.find(([, pattern]) => pattern.test(haystack));
    if (rule) return rule[0];
  }
  return 'OTHER';
}

function normalizeType(type) {
  return String(type || '').trim().toLowerCase();
}

// Each extra independent report removes 65% of the remaining doubt; a second intake
// channel (e.g. a voice call backing up a social post) adds a flat bonus.
function computeConfidence(reportCount, sourceCount) {
  const base = Math.round(100 * (1 - 0.65 ** Math.max(1, reportCount)));
  return Math.min(99, base + (sourceCount > 1 ? 10 : 0));
}

function verificationFor(confidence) {
  if (confidence >= 70) return 'CONFIRMED';
  if (confidence >= 50) return 'CORROBORATED';
  return 'UNCONFIRMED';
}

function normalizeSource(source) {
  const value = String(source || '').toUpperCase();
  return VALID_SOURCES.has(value) ? value : 'UNKNOWN';
}

// Turns an untrusted request body into a validated report. Throws 422 when the report
// does not say what happened and where; such reports are never registered.
function toReport(body, receivedAt = new Date()) {
  const analysis = assertReportable(sanitizeIncidentAnalysis(body));
  return {
    ...analysis,
    category: classifyCategory(analysis.type, analysis.description),
    source: normalizeSource(body && body.source),
    receivedAt,
  };
}

function toStoredReport(report) {
  return {
    source: report.source,
    type: report.type,
    description: report.description,
    severity: report.severity,
    address: report.location.address,
    coordinates: report.location.coordinates,
    receivedAt: report.receivedAt,
  };
}

function lastActivity(incident) {
  return new Date(incident.lastReportedAt || incident.timestamp || 0).getTime();
}

function isSameEvent(report, incident) {
  // Derived rather than read from incident.category: pre-correlation documents come back
  // with the schema default 'OTHER', and the type/description never change after creation.
  const category = classifyCategory(incident.type, incident.description);
  if (category !== report.category) return false;
  // "OTHER" is a catch-all, so it needs the literal type to agree as well.
  if (category === 'OTHER' && normalizeType(incident.type) !== normalizeType(report.type)) return false;
  return true;
}

// Picks the nearest open incident that plausibly describes the same event, or null.
function findBestMatch(report, candidates, now = report.receivedAt) {
  const reportTime = new Date(now).getTime();
  let best = null;

  for (const incident of candidates) {
    if (incident.status === 'RESOLVED') continue;
    if (!isValidCoordinates(incident.location && incident.location.coordinates)) continue;
    if (reportTime - lastActivity(incident) > quietPeriodFor(report.category)) continue;
    if (!isSameEvent(report, incident)) continue;

    const distanceKm = haversineKm(report.location.coordinates, incident.location.coordinates);
    if (distanceKm > CORRELATION_RADIUS_KM) continue;
    if (!best || distanceKm < best.distanceKm) best = { incident, distanceKm };
  }

  return best;
}

function buildNewIncident(report) {
  const sources = [report.source];
  const confidence = computeConfidence(1, sources.length);

  return {
    type: report.type,
    description: report.description,
    severity: report.severity,
    location: report.location,
    breakdown: report.breakdown,
    action_plan: report.action_plan,
    status: 'PENDING',
    assignedUnit: null,
    timestamp: report.receivedAt,
    category: report.category,
    reports: [toStoredReport(report)],
    reportCount: 1,
    sources,
    confidence,
    verification: verificationFor(confidence),
    lastReportedAt: report.receivedAt,
  };
}

function unionStrings(a = [], b = []) {
  return [...new Set([...a, ...b])];
}

// Returns the fields that change when `report` is folded into `incident`.
function buildMergedFields(incident, report) {
  const previousCount = incident.reportCount || 1;
  const reportCount = previousCount + 1;
  const sources = unionStrings(incident.sources, [report.source]);
  const confidence = computeConfidence(reportCount, sources.length);

  // Running mean keeps the marker at the centre of everything witnesses described.
  const [lat, lng] = incident.location.coordinates;
  const [rLat, rLng] = report.location.coordinates;
  const coordinates = [lat + (rLat - lat) / reportCount, lng + (rLng - lng) / reportCount];

  const breakdown = incident.breakdown || {};
  return {
    reportCount,
    sources,
    confidence,
    verification: verificationFor(confidence),
    severity: Math.max(incident.severity || 0, report.severity),
    'location.coordinates': coordinates,
    'breakdown.acoustics': unionStrings(breakdown.acoustics, report.breakdown.acoustics),
    'breakdown.visual_clues': unionStrings(breakdown.visual_clues, report.breakdown.visual_clues),
    'breakdown.logistics_needed': unionStrings(breakdown.logistics_needed, report.breakdown.logistics_needed),
    lastReportedAt: report.receivedAt,
  };
}

// Incidents created before correlation existed have no report history; seed it from the
// incident itself so the corroboration list shows the original report too.
function legacySeedReport(incident) {
  return {
    source: 'UNKNOWN',
    type: incident.type,
    description: incident.description,
    severity: incident.severity,
    address: incident.location && incident.location.address,
    coordinates: incident.location && incident.location.coordinates,
    receivedAt: incident.timestamp,
  };
}

// Node runs one ingest at a time, so two reports of the same event arriving together
// cannot both miss each other and create duplicate incidents.
let ingestQueue = Promise.resolve();
function serialized(task) {
  const run = ingestQueue.then(task, task);
  ingestQueue = run.catch(() => {});
  return run;
}

function ingestReport(body) {
  return serialized(async () => {
    const report = toReport(body);
    // Coarse DB pre-filter only; findBestMatch applies the per-category quiet period.
    const cutoff = new Date(report.receivedAt.getTime() - MAX_QUIET_PERIOD_MS);

    const candidates = await Incident.find({
      status: { $ne: 'RESOLVED' },
      $or: [
        { lastReportedAt: { $gte: cutoff } },
        { lastReportedAt: null, timestamp: { $gte: cutoff } },
      ],
    });

    const match = findBestMatch(report, candidates);

    if (!match) {
      const created = await Incident.create(buildNewIncident(report));
      return { incident: created, merged: false, distanceKm: null };
    }

    const incident = match.incident;
    const seed = incident.reports.length === 0 ? [legacySeedReport(incident)] : [];

    incident.set(buildMergedFields(incident, report));
    incident.category = report.category; // same by construction; backfills legacy docs
    incident.reports = [...incident.reports, ...seed, toStoredReport(report)].slice(-MAX_STORED_REPORTS);
    await incident.save();

    return { incident, merged: true, distanceKm: match.distanceKm };
  });
}

module.exports = {
  CORRELATION_RADIUS_KM,
  QUIET_PERIOD_MS_BY_CATEGORY,
  buildMergedFields,
  buildNewIncident,
  classifyCategory,
  computeConfidence,
  findBestMatch,
  ingestReport,
  quietPeriodFor,
  toReport,
  verificationFor,
};
