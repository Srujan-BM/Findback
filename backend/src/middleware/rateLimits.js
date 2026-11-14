const rateLimit = require('express-rate-limit');

function getRateLimitDefaults(environment = process.env.NODE_ENV) {
  return environment === 'production'
    ? { api: 300, auth: 30 }
    : { api: 1500, auth: 120 };
}

function createRateLimiter(scope, limit, windowMs = 15 * 60 * 1000) {
  const message = scope === 'auth'
    ? 'Too many authentication attempts. Please try again later.'
    : 'Too many API requests. Please try again later.';

  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler(_req, res) {
      res.setHeader('X-RateLimit-Scope', scope);
      res.status(429).json({ message, rateLimitScope: scope });
    },
  });
}

module.exports = { createRateLimiter, getRateLimitDefaults };
