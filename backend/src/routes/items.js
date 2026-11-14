const express = require('express');
const { z } = require('zod');
const Item = require('../models/Item');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { saveImages } = require('../services/images');
const { createSuggestions } = require('../services/matching');
const { createItemEmbeddings } = require('../services/imageEmbeddings');
const AuditLog = require('../models/AuditLog');

const router = express.Router();
const itemFields = z.object({
  itemName: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(60),
  brand: z.string().trim().max(80).optional().default(''),
  color: z.string().trim().max(50).optional().default(''),
  description: z.string().trim().min(10).max(2000),
  distinctiveFeatures: z.string().trim().max(1000).optional().default(''),
  privateVerificationData: z.string().trim().max(1000).optional().default(''),
  location: z.string().trim().min(2).max(160),
  reportDate: z.coerce.date(),
});

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));
  const filter = { status: { $in: ['ACTIVE', 'MATCH_FOUND', 'CLAIM_PENDING', 'CLAIM_RECEIVED', 'VERIFIED'] } };
  if (['lost', 'found'].includes(req.query.type)) filter.reportType = req.query.type;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.q) filter.$text = { $search: String(req.query.q).slice(0, 100) };
  const sort = req.query.q ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 };
  const [items, total] = await Promise.all([
    Item.find(filter).select('reportType itemName category brand color description location reportDate images status reporterId createdAt').populate('reporterId', 'name').sort(sort).skip((page - 1) * limit).limit(limit),
    Item.countDocuments(filter),
  ]);
  res.json({ items, page, pages: Math.ceil(total / limit), total });
});

router.post('/:type', requireAuth, (req, res, next) => {
  if (!['lost', 'found'].includes(req.params.type)) return res.status(404).json({ message: 'Report type not found.' });
  upload.array('images', 5)(req, res, (error) => error ? next(error) : next());
}, async (req, res) => {
  if (!req.files?.length || req.files.length > 5) {
    return res.status(400).json({ message: 'Add between 1 and 5 item photos.' });
  }
  const parsed = itemFields.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const images = await saveImages(req.files);
  const item = await Item.create({
    ...parsed.data,
    reporterId: req.user.id,
    reportType: req.params.type,
    images,
  });
  if (process.env.IMAGE_EMBEDDING_URL) {
    try {
      const imageEmbeddings = await createItemEmbeddings(images);
      if (imageEmbeddings) {
        item.imageEmbeddings = imageEmbeddings;
        await item.save();
      }
    } catch (error) {
      console.warn('Image embeddings unavailable; using attribute-based matching:', error.message);
    }
  }
  await createSuggestions(item);
  const savedItem = await Item.findById(item.id);
  await AuditLog.create({ actorId: req.user.id, action: 'item.created', targetType: 'Item', targetId: item.id, metadata: { reportType: item.reportType } });
  const matches = await Match.countDocuments({ $or: [{ lostItemId: item.id }, { foundItemId: item.id }] });
  res.status(201).json({ item: savedItem, possibleMatches: matches });
});

router.get('/mine', requireAuth, async (req, res) => {
  const items = await Item.find({ reporterId: req.user.id }).sort({ createdAt: -1 });
  res.json({ items });
});

router.get('/:id/private', requireAuth, async (req, res) => {
  const item = await Item.findById(req.params.id).select('+privateVerificationData +distinctiveFeatures');
  if (!item || item.reporterId.toString() !== req.user.id) return res.status(404).json({ message: 'Private report details not found.' });
  res.json({
    privateVerificationData: item.reportType === 'found' ? item.privateVerificationData : undefined,
    distinctiveFeatures: item.distinctiveFeatures,
  });
});

router.get('/:id', async (req, res) => {
  const item = await Item.findById(req.params.id)
    .select('reportType itemName category brand color description location reportDate images status reporterId createdAt')
    .populate('reporterId', 'name');
  if (!item) return res.status(404).json({ message: 'This report is no longer available.' });
  res.json({ item });
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ['CLOSED', 'RECOVERED', 'RETURNED'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'That status change is not allowed.' });
  const item = await Item.findOne({ _id: req.params.id, reporterId: req.user.id });
  if (!item) return res.status(404).json({ message: 'Report not found.' });
  if (status === 'RECOVERED' && item.reportType !== 'lost') return res.status(400).json({ message: 'Found reports should be marked returned.' });
  if (status === 'RETURNED' && item.reportType !== 'found') return res.status(400).json({ message: 'Lost reports should be marked recovered.' });
  item.status = status;
  await item.save();
  await AuditLog.create({ actorId: req.user.id, action: 'item.status_changed', targetType: 'Item', targetId: item.id, metadata: { status } });
  res.json({ item });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, reporterId: req.user.id, status: { $nin: ['RECOVERED', 'RETURNED'] } },
    { status: 'CLOSED' },
    { new: true },
  );
  if (!item) return res.status(404).json({ message: 'Open report not found.' });
  await AuditLog.create({ actorId: req.user.id, action: 'item.closed', targetType: 'Item', targetId: item.id });
  res.json({ message: 'Report closed.' });
});

router.post('/:id/report', requireAuth, async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Report not found.' });
  const reason = z.string().trim().min(5).max(500).safeParse(req.body.reason);
  if (!reason.success) return res.status(400).json({ message: 'Please provide a reason of at least five characters.' });
  const Report = require('../models/Report');
  await Report.create({ reporterId: req.user.id, reportedItemId: item.id, reason: reason.data });
  await Notification.create({ userId: req.user.id, type: 'report_received', title: 'Report received', message: 'Our team will review this listing.' });
  res.status(201).json({ message: 'Thanks. Our team will review this listing.' });
});

module.exports = router;
