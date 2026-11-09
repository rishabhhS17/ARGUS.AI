const { haversineKm, isValidCoordinates } = require('../utils/geo');

const UNIT_TYPES = ['POLICE', 'FIRE', 'MEDICAL'];

// For each unit type, the closest IDLE unit to the incident (at most one per type),
// nearest first. Kept pure so it can be unit-tested and reused by auto-dispatch later.
function rankNearestUnits(incidentCoordinates, units) {
  if (!isValidCoordinates(incidentCoordinates)) return [];

  const nearestByType = new Map();

  for (const unit of units) {
    if (unit.status !== 'IDLE' || !UNIT_TYPES.includes(unit.type)) continue;
    if (!isValidCoordinates(unit.coordinates)) continue;

    const distanceKm = haversineKm(incidentCoordinates, unit.coordinates);
    const best = nearestByType.get(unit.type);
    if (!best || distanceKm < best.distanceKm) {
      nearestByType.set(unit.type, { ...unit, distanceKm: Number(distanceKm.toFixed(3)) });
    }
  }

  return [...nearestByType.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { UNIT_TYPES, rankNearestUnits };
