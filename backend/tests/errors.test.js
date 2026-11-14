const test = require('node:test');
const assert = require('node:assert/strict');
const { errorHandler } = require('../src/middleware/errors');

test('duplicate MongoDB key errors return HTTP 409', () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  errorHandler({ code: 11000 }, {}, res, () => {});

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, 'An account with that email already exists.');
});
