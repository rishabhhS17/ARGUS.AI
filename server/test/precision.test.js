const test = require('node:test');
const assert = require('node:assert/strict');

const { findMissingDetails, sanitizeIncidentAnalysis } = require('../src/utils/aiResponseParser');
const {
  buildMergedFields,
  buildNewIncident,
  findBestMatch,
  matchRadiusKm,
  toAnyReport,
  toReport,
} = require('../src/services/correlationService');
const { rankLeadCandidates } = require('../src/services/leadService');

const NOW = new Date('2026-11-09T10:00:00Z');
const CP = [28.6315, 77.2167];          // Connaught Place
const DELHI_CENTRE = [28.6139, 77.2090];
const SAROJINI = [28.5775, 77.1983];    // ~6 km from CP
const MUMBAI = [19.0760, 72.8777];
const KM_NORTH = (km) => [CP[0] + km / 111, CP[1]]; // ~1 km per 1/111 degree of latitude

function fire(location, extra = {}, at = NOW) {
  return toAnyReport({
    type: 'Building Fire',
    description: 'Thick smoke from a shop',
    severity: 6,
    source: 'SOCIAL',
    location,
    ...extra,
  }, at);
}

// --- A: precision is part of every report ---------------------------------------------

test('precision is read from the analysis, defaulting to area when absent or invalid', () => {
  const loc = (precision) => sanitizeIncidentAnalysis({ location: { address: 'x', coordinates: CP, precision } }).location.precision;
  assert.equal(loc('exact'), 'exact');
  assert.equal(loc(' CITY '), 'city');
  assert.equal(loc(undefined), 'area');
  assert.equal(loc('street'), 'area');
});

test('a city-level report needs a place name but not pin-able coordinates', () => {
  const base = { type: 'Fire', description: 'Big fire reported somewhere', severity: 5 };
  assert.deepEqual(findMissingDetails(sanitizeIncidentAnalysis({ ...base, location: { address: 'Delhi', precision: 'city' } })), []);
  assert.deepEqual(
    findMissingDetails(sanitizeIncidentAnalysis({ ...base, location: { address: 'Janpath', precision: 'exact' } })),
    ['a place that can be located on the map'],
  );
  assert.deepEqual(
    findMissingDetails(sanitizeIncidentAnalysis({ ...base, location: { precision: 'city' } })),
    ['the name of the place where it happened'],
  );
});

test('city/region reports are never turned into map incidents', () => {
  const vague = { address: 'Delhi', coordinates: DELHI_CENTRE, precision: 'city' };
  assert.equal(fire(vague).location.precision, 'city');
  assert.throws(() => toReport({ type: 'Fire', description: 'Fire somewhere in Delhi', location: vague }), (err) => err.statusCode === 422);
});

// --- B: precision decides the merge radius and the marker weight -----------------------

test('the merge radius follows the looser of the two precisions', () => {
  assert.equal(matchRadiusKm('exact', 'exact'), 0.5);
  assert.equal(matchRadiusKm('exact', 'area'), 1.5);
  assert.equal(matchRadiusKm('area', undefined), 1.5); // legacy incidents behave as before
});

test('two exact reports 0.8 km apart are different events; two area reports are not', () => {
  const exactIncident = { _id: 'e', ...buildNewIncident(fire({ address: 'Janpath 12', coordinates: CP, precision: 'exact' })) };
  const exactReport = fire({ address: 'Barakhamba Rd 3', coordinates: KM_NORTH(0.8), precision: 'exact' });
  assert.equal(findBestMatch(exactReport, [exactIncident]), null);

  const areaIncident = { _id: 'a', ...buildNewIncident(fire({ address: 'Connaught Place', coordinates: CP, precision: 'area' })) };
  const areaReport = fire({ address: 'CP outer circle', coordinates: KM_NORTH(0.8), precision: 'area' });
  assert.ok(findBestMatch(areaReport, [areaIncident]));
});

test('an exact report pulls the pin harder than the area-level report that created it', () => {
  const incident = buildNewIncident(fire({ address: 'Connaught Place', coordinates: CP, precision: 'area' }));
  const exact = fire({ address: 'Janpath 12', coordinates: KM_NORTH(1), precision: 'exact' });

  const fields = buildMergedFields(incident, exact);
  const moved = (fields['location.coordinates'][0] - CP[0]) / (KM_NORTH(1)[0] - CP[0]);
  assert.ok(Math.abs(moved - 1 / 1.4) < 1e-9, `moved ${moved}`); // weights: area 0.4, exact 1
  assert.equal(fields.locationPrecision, 'exact');
});

test('a city-level report attached by an operator never moves the pin', () => {
  const incident = buildNewIncident(fire({ address: 'Janpath 12', coordinates: CP, precision: 'exact' }));
  const fields = buildMergedFields(incident, fire({ address: 'Delhi', coordinates: DELHI_CENTRE, precision: 'city' }));

  assert.deepEqual(fields['location.coordinates'], CP);
  assert.equal(fields.locationPrecision, 'exact');
  assert.equal(fields.reportCount, 2); // it still counts as corroboration
});

// --- C: unplaced reports get suggestions, never automatic merges ----------------------

function openIncident(id, location, extra = {}) {
  return { _id: id, ...buildNewIncident(fire(location, extra.report)), ...extra.fields };
}

test('suggests open same-kind incidents inside the city, nearest first', () => {
  const lead = {
    type: 'Fire', category: 'FIRE', description: 'There is a fire in Delhi', severity: 5,
    address: 'Delhi', coordinates: DELHI_CENTRE, precision: 'city', source: 'SOCIAL', receivedAt: NOW,
  };
  const incidents = [
    openIncident('sarojini', { address: 'Sarojini Nagar', coordinates: SAROJINI, precision: 'area' }),
    openIncident('cp', { address: 'Connaught Place', coordinates: CP, precision: 'area' }),
    openIncident('crash', { address: 'CP', coordinates: CP, precision: 'area' }, { report: { type: 'Road Accident', description: 'Two cars collided' } }),
    openIncident('done', { address: 'CP', coordinates: CP, precision: 'area' }, { fields: { status: 'RESOLVED' } }),
    openIncident('mumbai', { address: 'Andheri', coordinates: MUMBAI, precision: 'area' }),
  ];

  const ranked = rankLeadCandidates(lead, incidents, NOW);
  assert.deepEqual(ranked.map((c) => c._id), ['cp', 'sarojini']);
  assert.ok(ranked[0].distanceKm < ranked[1].distanceKm);
});

test('without coordinates, suggestions are the most recently active matching incidents', () => {
  const lead = {
    type: 'Fire', category: 'FIRE', description: 'Fire somewhere in the state', severity: 5,
    address: 'Haryana', coordinates: [], precision: 'region', source: 'HELPLINE', receivedAt: NOW,
  };
  const older = openIncident('older', { address: 'A', coordinates: CP, precision: 'area' }, {
    fields: { lastReportedAt: new Date(NOW.getTime() - 60 * 60 * 1000) },
  });
  const newer = openIncident('newer', { address: 'B', coordinates: SAROJINI, precision: 'area' });

  const ranked = rankLeadCandidates(lead, [older, newer], NOW);
  assert.deepEqual(ranked.map((c) => c._id), ['newer', 'older']);
  assert.equal(ranked[0].distanceKm, null);
});
