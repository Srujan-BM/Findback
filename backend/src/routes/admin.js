const express = require('express');
const User = require('../models/User');
const Item = require('../models/Item');
const Match = require('../models/Match');
const Claim = require('../models/Claim');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', async (_req, res) => {
  const [users, items, lost, found, openClaims, openReports, matches, recentLogs] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Item.countDocuments({ reportType: 'lost' }),
    Item.countDocuments({ reportType: 'found' }),
    Claim.countDocuments({ status: 'pending' }),
    Report.countDocuments({ status: 'open' }),
    Match.countDocuments(),
    AuditLog.find().populate('actorId', 'name').sort({ createdAt: -1 }).limit(12),
  ]);
  res.json({ stats: { users, items, lost, found, openClaims, openReports, matches }, recentLogs });
});

router.get('/users', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const users = await User.find().select('name email role isActive createdAt').sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25);
  res.json({ users });
});

router.get('/items', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const items = await Item.find().select('itemName reportType category status reporterId createdAt').populate('reporterId', 'name email').sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25);
  res.json({ items });
});

router.get('/reports', async (req, res) => {
  const reports = await Report.find({ status: req.query.status || 'open' })
    .populate('reporterId', 'name email')
    .populate('reportedItemId', 'itemName reportType category status')
    .sort({ createdAt: -1 }).limit(100);
  res.json({ reports });
});

router.patch('/users/:id/status', async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'Choose an account status.' });
  if (req.params.id === req.user.id && !req.body.isActive) return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('name email role isActive');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  await AuditLog.create({ actorId: req.user.id, action: 'user.status_changed', targetType: 'User', targetId: user.id, metadata: { isActive: user.isActive } });
  res.json({ user });
});

router.patch('/reports/:id/status', async (req, res) => {
  if (!['reviewed', 'dismissed'].includes(req.body.status)) return res.status(400).json({ message: 'Choose reviewed or dismissed.' });
  const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!report) return res.status(404).json({ message: 'Report not found.' });
  await AuditLog.create({ actorId: req.user.id, action: 'report.moderated', targetType: 'Report', targetId: report.id, metadata: { status: report.status } });
  res.json({ report });
});

router.patch('/items/:id/status', async (req, res) => {
  if (!['CLOSED', 'ACTIVE', 'DISPUTED'].includes(req.body.status)) return res.status(400).json({ message: 'That moderation status is not allowed.' });
  const item = await Item.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!item) return res.status(404).json({ message: 'Item not found.' });
  await AuditLog.create({ actorId: req.user.id, action: 'item.moderated', targetType: 'Item', targetId: item.id, metadata: { status: item.status } });
  res.json({ item });
});

module.exports = router;
