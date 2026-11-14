const express = require('express');
const { z } = require('zod');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Item = require('../models/Item');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const conversations = await Conversation.find({ participants: req.user.id })
    .populate('participants', 'name profileImage')
    .populate('relatedItemId', 'itemName images reportType')
    .sort({ lastMessageAt: -1 });
  res.json({ conversations });
});

router.post('/', async (req, res) => {
  const parsed = z.object({ relatedItemId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Choose an item to discuss.' });
  const item = await Item.findById(parsed.data.relatedItemId);
  if (!item) return res.status(404).json({ message: 'Item report not found.' });
  if (item.reporterId.toString() === req.user.id) return res.status(400).json({ message: 'You cannot start a conversation with yourself.' });
  const participants = [item.reporterId, req.user.id];
  let conversation = await Conversation.findOne({ relatedItemId: item.id, participants: { $all: participants, $size: 2 } });
  if (!conversation) conversation = await Conversation.create({ relatedItemId: item.id, participants });
  res.status(201).json({ conversation });
});

router.get('/:id/messages', async (req, res) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  const messages = await Message.find({ conversationId: conversation.id })
    .populate('senderId', 'name profileImage')
    .sort({ createdAt: 1 })
    .limit(200);
  await Message.updateMany({ conversationId: conversation.id, senderId: { $ne: req.user.id }, readAt: null }, { readAt: new Date() });
  res.json({ messages });
});

router.post('/:id/messages', async (req, res) => {
  const parsed = z.object({ content: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Message must be between 1 and 2,000 characters.' });
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user.id });
  if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  const message = await Message.create({ conversationId: conversation.id, senderId: req.user.id, content: parsed.data.content });
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();
  const populated = await message.populate('senderId', 'name profileImage');
  const io = req.app.get('io');
  io?.to(`conversation:${conversation.id}`).emit('message:new', populated);
  const recipient = conversation.participants.find((participant) => participant.toString() !== req.user.id);
  const Notification = require('../models/Notification');
  await Notification.create({ userId: recipient, type: 'message', title: 'New message', message: `${req.user.name} sent you a message.`, relatedItemId: conversation.relatedItemId });
  res.status(201).json({ message: populated });
});

module.exports = router;
