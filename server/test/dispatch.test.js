const test = require('node:test');
const assert = require('node:assert/strict');

const { rankNearestUnits } = require('../src/services/dispatchService');

const INCIDENT = [28.6315, 77.2167];

function unit(name, type, coordinates, status = 'IDLE') {
  return { _id: name, name, type, coordinates, status };
}

test('suggests the nearest idle unit of each type, nearest first', () => {
  const units = [
    unit('PCR-far', 'POLICE', [28.70, 77.30]),
    unit('PCR-near', 'POLICE', [28.632, 77.217]),
    unit('ENG-1', 'FIRE', [28.64, 77.23]),
    unit('MED-1', 'MEDICAL', [28.60, 77.20]),
  ];

  const ranked = rankNearestUnits(INCIDENT, units);
  assert.deepEqual(ranked.map((u) => u.name), ['PCR-near', 'ENG-1', 'MED-1']);
  assert.ok(ranked.every((u, i) => i === 0 || ranked[i - 1].distanceKm <= u.distanceKm));
  assert.ok(ranked[0].distanceKm < 0.2);
});

test('never suggests busy units, unknown types or units without a position', () => {
  const units = [
    unit('PCR-busy', 'POLICE', [28.632, 77.217], 'BUSY'),
    unit('BOAT-1', 'COAST_GUARD', [28.632, 77.217]),
    unit('ENG-nowhere', 'FIRE', null),
    unit('MED-ok', 'MEDICAL', [28.62, 77.21]),
  ];

  assert.deepEqual(rankNearestUnits(INCIDENT, units).map((u) => u.name), ['MED-ok']);
});

test('returns nothing when the incident has no valid position or no units are idle', () => {
  assert.deepEqual(rankNearestUnits(null, [unit('PCR', 'POLICE', [28.6, 77.2])]), []);
  assert.deepEqual(rankNearestUnits(INCIDENT, [unit('PCR', 'POLICE', [28.6, 77.2], 'BUSY')]), []);
});
