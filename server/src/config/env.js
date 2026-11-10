require('dotenv').config();

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
};

module.exports = { env };
