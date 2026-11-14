const jwt = require('jsonwebtoken');

const publicAuthPaths = new Set(['/auth/register', '/auth/login', '/auth/logout']);

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.cookies?.findbackToken || publicAuthPaths.has(req.path)) {
    return next();
  }
  try {
    const token = req.get('x-csrf-token');
    const payload = token && jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.csrf !== true) return res.status(403).json({ message: 'Your security token expired. Refresh the page and try again.' });
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Your security token expired. Refresh the page and try again.' });
    }
    next(error);
  }
}

module.exports = csrfProtection;
