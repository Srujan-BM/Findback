const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { createRateLimiter, getRateLimitDefaults } = require('../src/middleware/rateLimits');

async function checkRateLimit(scope) {
  const app = express();
  app.use(createRateLimiter(scope, 1));
  app.get('/', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    assert.equal((await fetch(url)).status, 200);
    const limited = await fetch(url);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('x-ratelimit-scope'), scope);
    assert.equal((await limited.json()).rateLimitScope, scope);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('429 responses identify the API limiter', () => checkRateLimit('api'));
test('429 responses identify the authentication limiter', () => checkRateLimit('auth'));
test('development limits are higher but production limits remain strict', () => {
  assert.deepEqual(getRateLimitDefaults('development'), { api: 1500, auth: 120 });
  assert.deepEqual(getRateLimitDefaults('production'), { api: 300, auth: 30 });
});
