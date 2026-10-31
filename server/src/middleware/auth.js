'use strict';
/**
 * Auth middleware
 * Verifies JWT access token from Authorization header.
 * Attaches decoded user payload to req.user.
 */
const { verifyAccessToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const User = require('../models/User');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }
    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);

    // Load fresh user to check active/banned status
    const user = await User.findById(decoded.sub).select('isActive isBanned role');
    if (!user || !user.isActive || user.isBanned) {
      return next(new AppError('Account is inactive or banned.', 401, 'ACCOUNT_INACTIVE'));
    }

    req.user = { id: decoded.sub, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid access token.', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Optional auth — attaches user if token present, continues even if not.
 */
async function optionalAuthenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const token = authHeader.slice(7);
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select('isActive isBanned role');
    if (user && user.isActive && !user.isBanned) {
      req.user = { id: decoded.sub, role: user.role };
    }
  } catch {
    // swallow — token optional
  }
  next();
}

/**
 * Role-based access guard factory.
 * Usage: requireRole('admin') or requireRole('moderator', 'admin')
 */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions.', 403, 'FORBIDDEN'));
    }
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, requireRole };
