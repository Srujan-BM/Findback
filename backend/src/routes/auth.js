const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const credentials = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('findbackToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function createCsrfToken() {
  return jwt.sign({ csrf: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const publicUser = (user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage });

router.post('/register', async (req, res) => {
  const parsed = credentials.extend({ name: z.string().trim().min(2).max(80) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0].message });
  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email: normalizedEmail, passwordHash });
  setSessionCookie(res, user);
  res.status(201).json({ user: publicUser(user), csrfToken: createCsrfToken() });
});

router.post('/login', async (req, res) => {
  const parsed = credentials.omit({ name: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' });
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive || !(await user.verifyPassword(parsed.data.password))) {
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  }
  setSessionCookie(res, user);
  res.json({ user: publicUser(user), csrfToken: createCsrfToken() });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('findbackToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'You are signed out.' });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.get('/csrf', requireAuth, (_req, res) => res.json({ csrfToken: createCsrfToken() }));

router.patch('/profile', requireAuth, async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(80) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' });
  req.user.name = parsed.data.name;
  await req.user.save();
  await AuditLog.create({ actorId: req.user.id, action: 'user.profile_updated', targetType: 'User', targetId: req.user.id });
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
