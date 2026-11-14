const Match = require('../models/Match');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const { bestVisualSimilarity } = require('./imageEmbeddings');

const normalize = (value = '') => value.toLowerCase().trim();
const defaultWeights = { category: 30, color: 20, brand: 20, keyword: 5, keywordMax: 20, location: 10, date: 10 };
const configuredWeight = (name) => {
  const suffix = name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase();
  const value = Number(process.env[`MATCH_WEIGHT_${suffix}`]);
  return Number.isFinite(value) && value >= 0 ? value : defaultWeights[name];
};
const matchThreshold = () => {
  const value = Number(process.env.MATCH_MIN_SCORE);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : 25;
};

function scorePair(lost, found) {
  let score = 0;
  const reasons = [];
  if (normalize(lost.category) === normalize(found.category)) {
    score += configuredWeight('category');
    reasons.push('Same item category');
  }
  if (lost.color && found.color && normalize(lost.color) === normalize(found.color)) {
    score += configuredWeight('color');
    reasons.push('Matching color');
  }
  if (lost.brand && found.brand && normalize(lost.brand) === normalize(found.brand)) {
    score += configuredWeight('brand');
    reasons.push('Matching brand');
  }
  const leftWords = new Set(`${lost.itemName} ${lost.description}`.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const rightWords = new Set(`${found.itemName} ${found.description}`.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const shared = [...leftWords].filter((word) => rightWords.has(word));
  if (shared.length) {
    score += Math.min(configuredWeight('keywordMax'), shared.length * configuredWeight('keyword'));
    reasons.push(`Shared details: ${shared.slice(0, 3).join(', ')}`);
  }
  const leftLocation = normalize(lost.location);
  const rightLocation = normalize(found.location);
  if (leftLocation.includes(rightLocation) || rightLocation.includes(leftLocation)) {
    score += configuredWeight('location');
    reasons.push('Nearby reported location');
  }
  const days = Math.abs(new Date(lost.reportDate) - new Date(found.reportDate)) / 86400000;
  if (days <= 14) {
    score += Math.round(configuredWeight('date') * (1 - days / 14));
    reasons.push('Reported within two weeks');
  }
  return { score: Math.min(score, 100), reasons };
}

async function createSuggestions(item) {
  const oppositeType = item.reportType === 'lost' ? 'found' : 'lost';
  const candidates = await Item.find({
    reportType: oppositeType,
    status: { $in: ['ACTIVE', 'MATCH_FOUND'] },
    _id: { $ne: item._id },
  }).select('+imageEmbeddings').limit(200);
  const matches = [];
  const matchedIds = new Set([item.id]);
  const pairs = [];
  for (const candidate of candidates) {
    const lost = item.reportType === 'lost' ? item : candidate;
    const found = item.reportType === 'found' ? item : candidate;
    const result = scorePair(lost, found);
    const visual = bestVisualSimilarity(item.imageEmbeddings, candidate.imageEmbeddings);
    const visualPercent = visual === null ? null : Math.round(visual * 100);
    const configuredVisualWeight = Number(process.env.MATCH_VISUAL_WEIGHT);
    const visualWeight = Number.isFinite(configuredVisualWeight)
      ? Math.max(0, Math.min(1, configuredVisualWeight))
      : 0.3;
    const overall = visualPercent === null
      ? result.score
      : Math.round(result.score * (1 - visualWeight) + visualPercent * visualWeight);
    if (overall < matchThreshold()) continue;
    const reasons = [...result.reasons];
    if (visualPercent !== null && visualPercent >= 70) reasons.push('Photos look visually similar');
    matchedIds.add(candidate.id);
    pairs.push({ lost, found });
    matches.push({
      updateOne: {
        filter: { lostItemId: lost._id, foundItemId: found._id },
        update: {
          $set: {
            attributeSimilarity: result.score,
            visualSimilarity: visualPercent,
            overallSimilarity: overall,
            matchingReasons: reasons,
            matchingMethod: visualPercent === null ? 'attributes' : 'attributes+visual',
          },
          $setOnInsert: { visualSimilarity: null, status: 'suggested' },
        },
        upsert: true,
      },
    });
  }
  if (matches.length) {
    const writeResult = await Match.bulkWrite(matches);
    const newPairs = Object.keys(writeResult.upsertedIds || {}).map(Number).map((index) => pairs[index]);
    await Promise.all(newPairs.flatMap(({ lost, found }) => [
      Notification.create({
        userId: lost.reporterId,
        type: 'possible_match',
        title: 'A possible match was found',
        message: `A found report for ${found.itemName} shares details with your report.`,
        relatedItemId: lost._id,
      }),
      Notification.create({
        userId: found.reporterId,
        type: 'possible_match',
        title: 'A possible match was found',
        message: `A lost report for ${lost.itemName} shares details with your report.`,
        relatedItemId: found._id,
      }),
    ]));
    await Item.updateMany({ _id: { $in: [...matchedIds] }, status: 'ACTIVE' }, { status: 'MATCH_FOUND' });
  }
}

module.exports = { scorePair, createSuggestions };
