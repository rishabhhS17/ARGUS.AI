const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests. Please try again shortly.' },
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

module.exports = { aiLimiter, apiLimiter };
