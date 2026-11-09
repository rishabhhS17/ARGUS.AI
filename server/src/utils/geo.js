const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Great-circle distance between two [lat, lng] points, in kilometres.
function haversineKm([lat1, lng1], [lat2, lng2]) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isValidCoordinates(value) {
  return Array.isArray(value)
    && value.length === 2
    && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]));
}

module.exports = { haversineKm, isValidCoordinates };
