const test = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns');
const path = require('node:path');
const { once } = require('node:events');

dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

test('registration, duplicate registration, login, session, and logout persist in MongoDB', {
  skip: !process.env.MONGODB_URI,
}, async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  let server;
  let userId;
  const email = `findback.integration.${Date.now()}@example.com`;
  const password = `F!ndback-${Date.now()}-Test`;
  try {
    await User.init();
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'FindBack Integration', email, password }),
    });
    assert.equal(registerResponse.status, 201);
    const registered = await registerResponse.json();
    userId = registered.user.id;
    const registerCookie = registerResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(registerCookie);
    assert.ok(registered.csrfToken);

    const savedUser = await User.findById(userId).select('+passwordHash');
    assert.ok(savedUser);
    assert.notEqual(savedUser.passwordHash, password);
    assert.equal(await savedUser.verifyPassword(password), true);

    const duplicateResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: registerCookie },
      body: JSON.stringify({ name: 'Another Name', email: email.toUpperCase(), password }),
    });
    assert.equal(duplicateResponse.status, 409);

    const invalidLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: `${password}-wrong` }),
    });
    assert.equal(invalidLogin.status, 401);

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: registerCookie },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginResponse.status, 200);
    const loggedIn = await loginResponse.json();
    const sessionCookie = loginResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(sessionCookie);
    assert.ok(loggedIn.csrfToken);

    const sessionResponse = await fetch(`${baseUrl}/auth/me`, { headers: { cookie: sessionCookie } });
    assert.equal(sessionResponse.status, 200);
    assert.equal((await sessionResponse.json()).user.id, userId);

    const logoutResponse = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { cookie: sessionCookie, 'x-csrf-token': loggedIn.csrfToken },
    });
    assert.equal(logoutResponse.status, 200);
    assert.match(logoutResponse.headers.get('set-cookie') || '', /findbackToken=;.*expires=thu, 01 jan 1970/i);
    const afterLogout = await fetch(`${baseUrl}/auth/me`);
    assert.equal(afterLogout.status, 401);
  } finally {
    if (userId) await User.findByIdAndDelete(userId);
    if (server) {
      server.close();
      await once(server, 'close');
    }
    await mongoose.disconnect();
  }
});
