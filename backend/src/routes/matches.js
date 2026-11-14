const express = require('express');
const Match = require('../models/Match');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const mine = await Item.find({ reporterId: req.user.id }).select('_id');
  const ids = mine.map((item) => item._id);
  const matches = await Match.find({ $or: [{ lostItemId: { $in: ids } }, { foundItemId: { $in: ids } }] })
    .populate({ path: 'lostItemId', select: 'itemName category color location reportDate images status reporterId', populate: { path: 'reporterId', select: 'name' } })
    .populate({ path: 'foundItemId', select: 'itemName category color location reportDate images status reporterId', populate: { path: 'reporterId', select: 'name' } })
    .sort({ overallSimilarity: -1, createdAt: -1 });
  res.json({ matches });
});

router.get('/:id', async (req, res) => {
  const match = await Match.findById(req.params.id)
    .populate({ path: 'lostItemId', select: 'itemName category color description location reportDate images status reporterId', populate: { path: 'reporterId', select: 'name' } })
    .populate({ path: 'foundItemId', select: 'itemName category color description location reportDate images status reporterId', populate: { path: 'reporterId', select: 'name' } });
  if (!match) return res.status(404).json({ message: 'Match not found.' });
  if (![match.lostItemId.reporterId.id, match.foundItemId.reporterId.id].includes(req.user.id)) {
    return res.status(403).json({ message: 'You cannot view this match.' });
  }
  res.json({ match });
});

router.post('/:id/:decision', async (req, res) => {
  if (!['accept', 'reject'].includes(req.params.decision)) return res.status(404).json({ message: 'That match action is not available.' });
  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ message: 'Match not found.' });
  const [lost, found] = await Promise.all([Item.findById(match.lostItemId), Item.findById(match.foundItemId)]);
  if (![lost.reporterId.toString(), found.reporterId.toString()].includes(req.user.id)) {
    return res.status(403).json({ message: 'You cannot update this match.' });
  }
  match.status = req.params.decision === 'accept' ? 'accepted' : 'rejected';
  await match.save();
  if (match.status === 'accepted') {
    const recipientId = req.user.id === lost.reporterId.toString() ? found.reporterId : lost.reporterId;
    await Notification.create({ userId: recipientId, type: 'match_accepted', title: 'A possible match was accepted', message: 'A report owner would like to connect about a possible match.', relatedItemId: req.user.id === lost.reporterId.toString() ? lost.id : found.id });
  }
  res.json({ match });
});

module.exports = router;
