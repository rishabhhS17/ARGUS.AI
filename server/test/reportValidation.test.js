const test = require('node:test');
const assert = require('node:assert/strict');

const {
  assertReportable,
  findMissingDetails,
  parseIncidentAnalysis,
  sanitizeIncidentAnalysis,
} = require('../src/utils/aiResponseParser');
const { toReport } = require('../src/services/correlationService');

const VALID = {
  type: 'Building Fire',
  description: 'Thick black smoke from a shop in Block A',
  severity: 6,
  location: { address: 'Connaught Place, New Delhi', coordinates: [28.6315, 77.2167] },
};

function withLocation(location) {
  return { ...VALID, location };
}

function missingFor(body) {
  return findMissingDetails(sanitizeIncidentAnalysis(body));
}

test('a report with an incident, a description and a named place is accepted', () => {
  assert.deepEqual(missingFor(VALID), []);
  assert.equal(toReport(VALID).location.address, 'Connaught Place, New Delhi');
});

test('no location is never replaced by a default city', () => {
  const sanitized = sanitizeIncidentAnalysis({ ...VALID, location: undefined });
  assert.equal(sanitized.location.address, null);
  assert.equal(sanitized.location.coordinates, null);
});

test('rejects a report that names no place', () => {
  assert.deepEqual(missingFor(withLocation({ address: null, coordinates: null })), [
    'the name of the place where it happened',
  ]);
});

test('placeholder place names count as missing', () => {
  for (const address of ['Unknown', 'N/A', 'Approximate location unavailable', 'not specified', 'Unknown location']) {
    assert.deepEqual(
      missingFor(withLocation({ address, coordinates: [28.6, 77.2] })),
      ['the name of the place where it happened'],
      address,
    );
  }
});

test('rejects a named place that could not be put on the map', () => {
  for (const coordinates of [null, [], [0, 0], [null, null], ['', ''], [95, 10], [10, 200], ['abc', 1]]) {
    assert.deepEqual(
      missingFor(withLocation({ address: 'Somewhere Road', coordinates })),
      ['a place that can be located on the map'],
      JSON.stringify(coordinates),
    );
  }
});

test('rejects a report that does not describe an incident', () => {
  assert.deepEqual(missingFor({ ...VALID, type: null }), ['what happened (the type of incident)']);
  assert.deepEqual(missingFor({ ...VALID, type: 'Unknown Incident' }), ['what happened (the type of incident)']);
  assert.deepEqual(missingFor({ ...VALID, type: 'No incident' }), ['what happened (the type of incident)']);
  assert.deepEqual(missingFor({ ...VALID, description: '' }), ['a description of the incident']);
  assert.deepEqual(missingFor({ ...VALID, description: 'fire' }), ['a description of the incident']);
});

test('an empty report lists everything that is missing', () => {
  assert.deepEqual(missingFor({}), [
    'what happened (the type of incident)',
    'a description of the incident',
    'the name of the place where it happened',
  ]);
});

test('rejection is a 422 with a message the reporter can act on', () => {
  assert.throws(
    () => assertReportable(sanitizeIncidentAnalysis(withLocation(null))),
    (err) => err.statusCode === 422
      && err.publicMessage === 'Report not registered. Please include the name of the place where it happened.',
  );
  assert.throws(() => toReport({}), (err) => err.statusCode === 422);
});

test('model output with null location parses, then fails validation', () => {
  const raw = '```json\n{"type":"Fire","description":"Smoke seen somewhere nearby","severity":5,"location":{"address":null,"coordinates":null}}\n```';
  const parsed = parseIncidentAnalysis(raw);
  assert.equal(parsed.location.coordinates, null);
  assert.throws(() => assertReportable(parsed), (err) => err.statusCode === 422);
});

test('malformed model output is still a 502, not a 422', () => {
  assert.throws(() => parseIncidentAnalysis('not json'), (err) => err.statusCode === 502);
});
