const test = require('node:test');
const assert = require('node:assert/strict');
const { scorePair } = require('../src/services/matching');
const { bestVisualSimilarity } = require('../src/services/imageEmbeddings');
const { detectImageFormat } = require('../src/services/images');

test('attribute matching explains category, color, brand, details, location, and close dates', () => {
  const result = scorePair(
    { category: 'Electronics', color: 'Black', brand: 'Acme', itemName: 'Headphones', description: 'Wireless headphones with a silver case', location: 'Central Station', reportDate: '2025-03-10' },
    { category: 'electronics', color: 'black', brand: 'acme', itemName: 'Wireless headphones', description: 'Found a silver case near station', location: 'Central Station', reportDate: '2025-03-12' },
  );

  assert.equal(result.score, 100);
  assert.ok(result.reasons.includes('Matching color'));
  assert.ok(result.reasons.includes('Nearby reported location'));
});

test('attribute weights can be configured without fabricating extra reasons', () => {
  const previous = process.env.MATCH_WEIGHT_CATEGORY;
  process.env.MATCH_WEIGHT_CATEGORY = '60';
  try {
    const result = scorePair(
      { category: 'Keys', color: '', brand: '', itemName: 'Keys', description: 'Small brass keys', location: 'West Park', reportDate: '2025-01-01' },
      { category: 'keys', color: '', brand: '', itemName: 'Wallet', description: 'Leather card holder', location: 'East Market', reportDate: '2025-05-01' },
    );
    assert.equal(result.score, 60);
    assert.deepEqual(result.reasons, ['Same item category']);
  } finally {
    if (previous === undefined) delete process.env.MATCH_WEIGHT_CATEGORY;
    else process.env.MATCH_WEIGHT_CATEGORY = previous;
  }
});

test('different reports do not get a fabricated visual score or guaranteed match', () => {
  const result = scorePair(
    { category: 'Keys', color: '', brand: '', itemName: 'Keys', description: 'Small brass keys', location: 'West Park', reportDate: '2025-01-01' },
    { category: 'Wallet', color: 'Brown', brand: '', itemName: 'Wallet', description: 'Leather card holder', location: 'East Market', reportDate: '2025-05-01' },
  );

  assert.equal(result.score, 0);
  assert.deepEqual(result.reasons, []);
});

test('visual similarity is calculated only from valid same-sized embeddings', () => {
  assert.equal(bestVisualSimilarity([[1, 0]], [[0, 1]]), 0);
  assert.equal(bestVisualSimilarity([[1, 0]], [[1, 0]]), 1);
  assert.equal(bestVisualSimilarity([[1, 0]], [[1, 0, 0]]), null);
});

test('image type validation checks file signatures instead of trusting labels', () => {
  assert.equal(detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png');
  assert.equal(detectImageFormat(Buffer.from('RIFF0000WEBP')), 'image/webp');
  assert.equal(detectImageFormat(Buffer.from('not an image')), null);
});
