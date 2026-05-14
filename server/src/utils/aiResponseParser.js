const DEFAULT_COORDINATES = [28.6139, 77.2090];

function stripMarkdownFences(value) {
  return String(value || '')
    .replace(/^`{1,3}\s*json\s*/i, '')
    .replace(/^`{1,3}\s*/i, '')
    .replace(/^json\s*/i, '')
    .replace(/\s*`{1,3}$/i, '')
    .trim();
}

function parseIncidentAnalysis(rawText) {
  const cleaned = stripMarkdownFences(rawText);

  try {
    return sanitizeIncidentAnalysis(JSON.parse(cleaned));
  } catch (err) {
    err.statusCode = 502;
    err.publicMessage = 'AI returned an invalid incident analysis';
    throw err;
  }
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
    type: asNonEmptyString(incident.type, 'Unknown Incident'),
    severity: clampNumber(incident.severity, 1, 10, 5),
    description: asNonEmptyString(incident.description, 'Incident details require operator review.'),
    location: {
      address: asNonEmptyString(location.address, 'Approximate location unavailable'),
      coordinates: asCoordinates(location.coordinates),
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

function asNonEmptyString(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringArray(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
    : [];
}

function asCoordinates(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    return DEFAULT_COORDINATES;
  }

  const lat = Number(value[0]);
  const lng = Number(value[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return DEFAULT_COORDINATES;
  }

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
  parseIncidentAnalysis,
  sanitizeIncidentAnalysis,
  stripMarkdownFences,
};
