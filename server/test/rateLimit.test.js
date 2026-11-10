const test = require('node:test');
const assert = require('node:assert/strict');

// Simulate running behind one proxy (Render). Must be set before the app is first loaded,
// because env.js reads it once. dotenv never overrides a variable that is already set.
process.env.TRUST_PROXY_HOPS = '1';

const { app } = require('../src/app');

// POST /api/ingest with no text or file is rejected by the controller with 400 *before*
// Gemini or the database is touched, but only after aiLimiter (10 per 30 min) has counted it.
// So 400 means "let through by the limiter", 429 means "blocked by the limiter".
let baseUrl;
let server;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

function ingestFrom(forwardedFor) {
  return fetch(`${baseUrl}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': forwardedFor },
    body: '{}',
  }).then((res) => res.status);
}

test('the AI limit is counted per client IP, not for the whole app', async () => {
  for (let i = 1; i <= 10; i += 1) {
    assert.equal(await ingestFrom('203.0.113.1'), 400, `request ${i} should pass the limiter`);
  }
  assert.equal(await ingestFrom('203.0.113.1'), 429, 'the 11th request from the same IP is blocked');

  // Another user is unaffected by the first user's limit.
  assert.equal(await ingestFrom('203.0.113.2'), 400);
});

test('a client cannot dodge the limit by writing its own X-Forwarded-For entry', async () => {
  // Only one proxy is trusted, so the IP that proxy saw (the last entry) is used and the
  // client-written "fake" entry in front of it is ignored.
  assert.equal(await ingestFrom('198.51.100.7, 203.0.113.1'), 429);
});
