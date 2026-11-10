require('dotenv').config();

// Reads a positive number from the environment. A missing value uses the default; an
// invalid one (text, zero, negative) also uses the default, with a warning, so a typo in
// the dashboard cannot silently switch correlation off.
function positiveNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (Number.isFinite(value) && value > 0) return value;

  console.warn(`[config] ${name}="${raw}" is not a positive number; using ${fallback}`);
  return fallback;
}

// Reads a whole number >= 0 (e.g. a proxy hop count). Missing or invalid uses the default.
function nonNegativeInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (Number.isInteger(value) && value >= 0) return value;

  console.warn(`[config] ${name}="${raw}" is not a whole number >= 0; using ${fallback}`);
  return fallback;
}

const env = {
  adminKey: process.env.ADMIN_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sentinel_db',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,
  // How many reverse proxies sit in front of the app (Render: 1, local: 0). Lets req.ip be
  // the real client so rate limits are per user. A hop count, never `true`: `true` would
  // trust a client-written X-Forwarded-For and let anyone pick a fresh IP per request.
  trustProxyHops: nonNegativeInteger('TRUST_PROXY_HOPS', 0),
  // Correlation: how far apart (km) two reports may be and still be the same event.
  // EXACT applies when both locations are specific places ("Gate 2, Sarojini market");
  // AREA applies when either one only names a neighbourhood ("Sarojini Nagar").
  matchRadiusExactKm: positiveNumber('MATCH_RADIUS_EXACT_KM', 0.5),
  matchRadiusAreaKm: positiveNumber('MATCH_RADIUS_AREA_KM', 1.5),
};

if (env.matchRadiusExactKm > env.matchRadiusAreaKm) {
  console.warn(
    `[config] MATCH_RADIUS_EXACT_KM (${env.matchRadiusExactKm}) is larger than MATCH_RADIUS_AREA_KM `
    + `(${env.matchRadiusAreaKm}); a specific place should not match from further away than a neighbourhood`,
  );
}

module.exports = { env };
