const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');

process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
const app = require('../src/app');

test('health check and invalid registration respond without database access', async () => {
  const server = app.listen(0);
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${origin}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const preflight = await fetch(`${origin}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        origin: 'http://127.0.0.1:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');

    const invalidRegistration = await fetch(`${origin}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'findbackToken=stale' },
      body: JSON.stringify({ name: 'A', email: 'not-an-email', password: 'short' }),
    });
    assert.equal(invalidRegistration.status, 400);

    const unsafeMutation = await fetch(`${origin}/api/items/lost`, {
      method: 'POST',
      headers: { cookie: 'findbackToken=present' },
    });
    assert.equal(unsafeMutation.status, 403);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
