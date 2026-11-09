const rateLimit = require('express-rate-limit');

function isPoll(req) {
  return req.method === 'GET' && req.path === '/data';
}

// Polling is excluded here: one open dashboard alone polls ~225 times per 15 minutes.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: isPoll,
  message: { error: 'Too many requests. Please try again shortly.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Room for several tabs per IP polling every 4s (15/min each); unchanged polls are cheap.
const pollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Polling too fast. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI calls are expensive and can trigger provider quota exhaustion, so they get a tighter budget.
const aiLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 10,
  message: { error: 'Too many AI requests. Please wait 30 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiLimiter, apiLimiter, pollLimiter };
