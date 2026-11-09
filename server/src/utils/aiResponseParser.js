// A report is only registered when it says what happened and where. Missing pieces are
// left as null here (never filled with a default city or a placeholder) and then
// rejected by assertReportable, so nothing lands on the map at a made-up location.

const MIN_DESCRIPTION_LENGTH = 10;

// How specific the named place is. exact/area can be pinned on the map; city/region name
// a place too large to pin ("fire in Delhi") and are kept as unplaced reports instead.
const PRECISIONS = ['exact', 'area', 'city', 'region'];
const PLACEABLE_PRECISIONS = new Set(['exact', 'area']);
// Reports that do not state a precision keep the pre-precision behaviour (pinned, 1.5 km).
const DEFAULT_PRECISION = 'area';

function isPlaceable(precision) {
  return PLACEABLE_PRECISIONS.has(precision);
}

// Values the model (or a client) uses to mean "I don't know".
const PLACEHOLDER = /^(unknown|unknown (location|place|area|incident|event)|n\/?a|none|null|nil|unspecified|not (specified|provided|mentioned|available|given)|no (location|place|incident)( (given|provided|mentioned))?|approximate location unavailable|location unavailable|tbd|-+)\.?$/i;
const NON_INCIDENT_TYPE = /^(other|no incident|not an incident|non[- ]?incident|irrelevant|spam|test)$/i;

function stripMarkdownFences(value) {
  return String(value || '')
    .replace(/^`{1,3}\s*json\s*/i, '')
    .replace(/^`{1,3}\s*/i, '')
    .replace(/^json\s*/i, '')
    .replace(/\s*`{1,3}$/i, '')
    .trim();
}

function parseIncidentAnalysis(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(stripMarkdownFences(rawText));
  } catch (err) {
    err.statusCode = 502;
    err.publicMessage = 'AI returned an invalid incident analysis';
    throw err;
  }

  return sanitizeIncidentAnalysis(parsed);
}

function sanitizeIncidentAnalysis(value) {
  const incident = value && typeof value === 'object' ? value : {};
  const location = incident.location && typeof incident.location === 'object'
    ? incident.location
    : {};
  const breakdown = incident.breakdown && typeof incident.breakdown === 'object'
    ? incident.breakdown
    : {};

  return {
    type: asMeaningfulString(incident.type),
    severity: clampNumber(incident.severity, 1, 10, 5),
    description: asMeaningfulString(incident.description),
    location: {
      address: asMeaningfulString(location.address),
      coordinates: asCoordinates(location.coordinates),
      precision: asPrecision(location.precision),
    },
    breakdown: {
      evidence_source: asNonEmptyString(breakdown.evidence_source, 'Unspecified'),
      acoustics: asStringArray(breakdown.acoustics),
      visual_clues: asStringArray(breakdown.visual_clues),
      logistics_needed: asStringArray(breakdown.logistics_needed),
    },
    action_plan: asNonEmptyString(incident.action_plan, 'Verify incident details and dispatch the nearest suitable unit.'),
  };
}

// Lists what a sanitized report is missing, in words a reporter can act on.
function findMissingDetails(incident) {
  const missing = [];

  if (!incident.type || NON_INCIDENT_TYPE.test(incident.type)) {
    missing.push('what happened (the type of incident)');
  }
  if (!incident.description || incident.description.length < MIN_DESCRIPTION_LENGTH) {
    missing.push('a description of the incident');
  }
  if (!incident.location.address) {
    missing.push('the name of the place where it happened');
  } else if (!incident.location.coordinates && isPlaceable(incident.location.precision)) {
    // A specific place must be mappable. A city/region-level report may lack coordinates:
    // it is never pinned, only kept as an unplaced report.
    missing.push('a place that can be located on the map');
  }

  return missing;
}

function assertReportable(incident) {
  const missing = findMissingDetails(incident);

  if (missing.length > 0) {
    const err = new Error(`Report rejected; missing: ${missing.join('; ')}`);
    err.statusCode = 422;
    err.publicMessage = `Report not registered. Please include ${joinList(missing)}.`;
    throw err;
  }

  return incident;
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function asMeaningfulString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && !PLACEHOLDER.test(trimmed) ? trimmed : null;
}

function asPrecision(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return PRECISIONS.includes(normalized) ? normalized : DEFAULT_PRECISION;
}

function asNonEmptyString(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
    : [];
}

// Returns [lat, lng] or null. [0, 0] is rejected: it is what models emit for "no idea".
function asCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) return null;
  if (value[0] === null || value[1] === null || value[0] === '' || value[1] === '') return null;

  const lat = Number(value[0]);
  const lng = Number(value[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;

  return [lat, lng];
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, number));
}

module.exports = {
  PRECISIONS,
  assertReportable,
  findMissingDetails,
  isPlaceable,
  parseIncidentAnalysis,
  sanitizeIncidentAnalysis,
  stripMarkdownFences,
};
