// Replaces the Socket.IO push channel. Every write bumps a version; clients poll
// GET /api/data?since=<version> and get a cheap "unchanged" reply until something moves.
//
// The counter lives in process memory, which is correct for the single Render instance
// this app runs on. The boot id makes a restart look like a change, so clients refetch.
// Running several instances would need a shared version (e.g. a Mongo doc or Redis key).

const bootId = Date.now().toString(36);
let counter = 0;

function markChanged() {
  counter += 1;
}

function getVersion() {
  return `${bootId}.${counter}`;
}

module.exports = { getVersion, markChanged };
