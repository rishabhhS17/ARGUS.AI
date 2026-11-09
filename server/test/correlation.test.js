const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMergedFields,
  buildNewIncident,
  classifyCategory,
  computeConfidence,
  findBestMatch,
  toReport,
  verificationFor,
} = require('../src/services/correlationService');

const NOW = new Date('2026-11-08T10:00:00Z');
const CP = [28.6315, 77.2167]; // Connaught Place, Delhi

function report(overrides = {}, at = NOW) {
  return toReport({
    type: 'Building Fire',
    description: 'Thick smoke from a shop',
    severity: 6,
    location: { address: 'Connaught Place', coordinates: CP },
    source: 'SOCIAL',
    ...overrides,
  }, at);
}

function incidentFrom(r, extra = {}) {
  return { _id: 'inc1', ...buildNewIncident(r), ...extra };
}

// ~0.5 km north of CP
const NEARBY = [CP[0] + 0.0045, CP[1]];
// ~5 km away
const FAR = [CP[0] + 0.045, CP[1]];

test('classifies free-form Gemini types into categories', () => {
  assert.equal(classifyCategory('Structure Fire'), 'FIRE');
  assert.equal(classifyCategory('Smoke sighting'), 'FIRE');
  assert.equal(classifyCategory('Road Accident with injuries'), 'ACCIDENT');
  assert.equal(classifyCategory('Armed Robbery'), 'CRIME');
  assert.equal(classifyCategory('Cardiac arrest'), 'MEDICAL');
  assert.equal(classifyCategory('Urban Flooding'), 'NATURAL_DISASTER');
  assert.equal(classifyCategory('Unknown Incident', 'Gas leak near market'), 'HAZMAT');
  assert.equal(classifyCategory('Suspicious package'), 'OTHER');
});

test('confidence rises with corroboration and channel diversity', () => {
  assert.equal(computeConfidence(1, 1), 35);
  assert.ok(computeConfidence(2, 1) > computeConfidence(1, 1));
  assert.ok(computeConfidence(2, 2) > computeConfidence(2, 1));
  assert.ok(computeConfidence(50, 2) <= 99);
  assert.equal(verificationFor(computeConfidence(1, 1)), 'UNCONFIRMED');
  assert.equal(verificationFor(computeConfidence(2, 1)), 'CORROBORATED');
  assert.equal(verificationFor(computeConfidence(3, 1)), 'CONFIRMED');
});

test('a single report is registered as an UNCONFIRMED incident, never dropped', () => {
  const inc = buildNewIncident(report({ severity: 10 }));
  assert.equal(inc.reportCount, 1);
  assert.equal(inc.verification, 'UNCONFIRMED');
  assert.equal(inc.severity, 10);
  assert.deepEqual(inc.sources, ['SOCIAL']);
});

test('matches a nearby same-category report inside the time window', () => {
  const existing = incidentFrom(report());
  const later = new Date(NOW.getTime() + 20 * 60 * 1000);
  const match = findBestMatch(report({ type: 'Fire', location: { address: 'CP', coordinates: NEARBY } }, later), [existing]);
  assert.ok(match);
  assert.ok(match.distanceKm > 0.3 && match.distanceKm < 0.7, `distance ${match.distanceKm}`);
});

test('does not match a different category at the same spot', () => {
  const existing = incidentFrom(report());
  assert.equal(findBestMatch(report({ type: 'Armed Robbery', description: 'Two men with knives' }), [existing]), null);
});

test('does not match the same category far away', () => {
  const existing = incidentFrom(report());
  assert.equal(findBestMatch(report({ location: { address: 'x', coordinates: FAR } }), [existing]), null);
});

test('does not match an incident that went quiet beyond the window', () => {
  const existing = incidentFrom(report());
  const later = new Date(NOW.getTime() + 3 * 60 * 60 * 1000);
  assert.equal(findBestMatch(report({}, later), [existing]), null);
});

test('does not match resolved incidents', () => {
  const existing = incidentFrom(report(), { status: 'RESOLVED' });
  assert.equal(findBestMatch(report(), [existing]), null);
});

test('OTHER category also requires the literal type to agree', () => {
  const existing = incidentFrom(report({ type: 'Suspicious package', description: 'Unattended bag' }));
  assert.ok(findBestMatch(report({ type: 'suspicious package', description: 'Bag left at gate' }), [existing]));
  assert.equal(findBestMatch(report({ type: 'Stray cattle', description: 'Cows on road' }), [existing]), null);
});

test('picks the nearest of several candidates', () => {
  const far = incidentFrom(report({ location: { address: 'a', coordinates: [CP[0] + 0.009, CP[1]] } }), { _id: 'far' });
  const near = incidentFrom(report(), { _id: 'near' });
  const match = findBestMatch(report({ location: { address: 'b', coordinates: [CP[0] + 0.001, CP[1]] } }), [far, near]);
  assert.equal(match.incident._id, 'near');
});

test('merging raises count, unions sources, keeps max severity and recentres location', () => {
  const existing = incidentFrom(report({ severity: 5 }));
  const fields = buildMergedFields(existing, report({
    severity: 8,
    source: 'HELPLINE',
    location: { address: 'CP', coordinates: NEARBY },
    breakdown: { visual_clues: ['flames on 2nd floor'] },
  }));

  assert.equal(fields.reportCount, 2);
  assert.deepEqual(fields.sources, ['SOCIAL', 'HELPLINE']);
  assert.equal(fields.severity, 8);
  assert.equal(fields.verification, 'CORROBORATED');
  assert.ok(Math.abs(fields['location.coordinates'][0] - (CP[0] + NEARBY[0]) / 2) < 1e-9);
  assert.deepEqual(fields['breakdown.visual_clues'], ['flames on 2nd floor']);
});

test('20 near-identical reports of one fire collapse into 1 high-confidence incident', () => {
  const incidents = [];

  for (let i = 0; i < 20; i += 1) {
    const at = new Date(NOW.getTime() + i * 60 * 1000);
    const jitter = [(i % 5) * 0.0008, (i % 3) * 0.0008]; // up to ~350 m of scatter
    const r = report({
      type: i % 2 ? 'Fire' : 'Building Fire',
      source: i % 4 === 0 ? 'HELPLINE' : 'SOCIAL',
      location: { address: 'CP', coordinates: [CP[0] + jitter[0], CP[1] + jitter[1]] },
    }, at);

    const match = findBestMatch(r, incidents);
    if (match) Object.assign(match.incident, applyDotted(match.incident, buildMergedFields(match.incident, r)));
    else incidents.push(incidentFrom(r, { _id: `inc${i}` }));
  }

  assert.equal(incidents.length, 1);
  assert.equal(incidents[0].reportCount, 20);
  assert.equal(incidents[0].verification, 'CONFIRMED');
  assert.deepEqual([...incidents[0].sources].sort(), ['HELPLINE', 'SOCIAL']);
});

// Applies a Mongo-style dotted update to a plain object (stands in for mongoose's doc.set).
function applyDotted(target, fields) {
  const copy = structuredClone(target);
  for (const [path, value] of Object.entries(fields)) {
    const keys = path.split('.');
    let node = copy;
    keys.slice(0, -1).forEach((k) => { node[k] = node[k] || {}; node = node[k]; });
    node[keys.at(-1)] = value;
  }
  return copy;
}
