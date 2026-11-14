require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const matchRoutes = require('./routes/matches');
const claimRoutes = require('./routes/claims');
const conversationRoutes = require('./routes/conversations');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const { notFound, errorHandler } = require('./middleware/errors');
const csrfProtection = require('./middleware/csrf');
const { createRateLimiter, getRateLimitDefaults } = require('./middleware/rateLimits');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const configuredOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = isProduction ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'];
const origins = [...new Set([...configuredOrigins, ...developmentOrigins])];
app.set('corsOrigins', origins);
const uploadDirectory = path.resolve(process.cwd(), 'uploads');
if (!process.env.CLOUDINARY_CLOUD_NAME) fs.mkdirSync(uploadDirectory, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    const error = new Error('This website is not allowed to access the API.');
    error.status = 403;
    callback(error);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', csrfProtection);
if (!process.env.CLOUDINARY_CLOUD_NAME) app.use('/uploads', express.static(uploadDirectory, { dotfiles: 'deny', maxAge: '1d' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const { api: apiLimit, auth: authLimit } = getRateLimitDefaults(process.env.NODE_ENV);
app.use('/api', createRateLimiter('api', apiLimit));
app.use('/api/auth', createRateLimiter('auth', authLimit), authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
