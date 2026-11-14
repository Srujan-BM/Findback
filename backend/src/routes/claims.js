const express = require('express');
const { z } = require('zod');
const Claim = require('../models/Claim');
const Item = require('../models/Item');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const { requireAuth } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');

const router = express.Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const parsed = z.object({
    itemId: z.string().min(1),
    verificationAnswers: z.string().trim().min(10).max(1000),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const item = await Item.findById(parsed.data.itemId);
  if (!item || item.reportType !== 'found' || item.status === 'CLOSED') return res.status(404).json({ message: 'This found report is unavailable.' });
  if (item.reporterId.toString() === req.user.id) return res.status(400).json({ message: 'You cannot claim your own report.' });
  const exists = await Claim.exists({ itemId: item.id, claimantId: req.user.id, status: 'pending' });
  if (exists) return res.status(409).json({ message: 'You already have an open claim for this report.' });
  const claim = await Claim.create({ ...parsed.data, claimantId: req.user.id, finderId: item.reporterId });
  item.status = 'CLAIM_RECEIVED';
  await item.save();
  await Notification.create({ userId: item.reporterId, type: 'claim_received', title: 'A new ownership claim', message: `Someone has submitted a claim for your ${item.itemName}.`, relatedItemId: item.id });
  res.status(201).json({ claim: { id: claim.id, status: claim.status }, message: 'Your claim was sent privately to the finder.' });
});

router.get('/', async (req, res) => {
  const claims = await Claim.find({ $or: [{ claimantId: req.user.id }, { finderId: req.user.id }] })
    .select('+verificationAnswers')
    .populate('itemId', 'itemName category images reportType status')
    .populate('claimantId', 'name')
    .populate('finderId', 'name')
    .sort({ createdAt: -1 });
  res.json({ claims });
});

router.patch('/:id/status', async (req, res) => {
  const parsed = z.object({
    status: z.enum(['accepted', 'rejected', 'more_info']),
    comments: z.string().trim().max(500).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Choose accept, reject, or request more information.' });
  const claim = await Claim.findOne({ _id: req.params.id, finderId: req.user.id });
  if (!claim) return res.status(404).json({ message: 'Claim not found.' });
  if (!['pending', 'more_info'].includes(claim.status)) return res.status(409).json({ message: 'This claim has already been reviewed.' });
  claim.status = parsed.data.status;
  claim.comments = parsed.data.comments || '';
  await claim.save();
  if (parsed.data.status !== 'more_info') {
    await Item.findByIdAndUpdate(claim.itemId, { status: parsed.data.status === 'accepted' ? 'VERIFIED' : 'ACTIVE' });
  }
  if (parsed.data.status === 'accepted') {
    let conversation = await Conversation.findOne({
      relatedItemId: claim.itemId,
      participants: { $all: [claim.finderId, claim.claimantId], $size: 2 },
    });
    if (!conversation) {
      conversation = await Conversation.create({ relatedItemId: claim.itemId, participants: [claim.finderId, claim.claimantId] });
    }
  }
  await Notification.create({
    userId: claim.claimantId,
    type: 'claim_update',
    title: parsed.data.status === 'accepted' ? 'Your claim was accepted' : parsed.data.status === 'rejected' ? 'Your claim was declined' : 'The finder needs more information',
    message: parsed.data.comments || 'Open your claims to see the latest update.',
    relatedItemId: claim.itemId,
  });
  await AuditLog.create({ actorId: req.user.id, action: 'claim.reviewed', targetType: 'Claim', targetId: claim.id, metadata: { status: claim.status } });
  res.json({ claim: { id: claim.id, status: claim.status, comments: claim.comments } });
});

module.exports = router;
