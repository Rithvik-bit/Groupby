'use strict';
/**
 * CSRF Protection Middleware — Double-Submit Cookie Pattern.
 * 
 * Protects cookie-authenticated mutations (such as refresh and logout)
 * against Cross-Site Request Forgery attacks.
 */
const crypto = require('crypto');

const CSRF_COOKIE_NAME = 'gb_csrf';

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function setCsrfCookie(res, token = generateCsrfToken()) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Accessible by client JS to read and send in X-CSRF-Token header
    secure: isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  return token;
}

/**
 * Middleware ensuring state-changing cookie-authenticated requests include a matching CSRF header.
 */
function csrfProtection(req, res, next) {
  // Safe HTTP methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Ensure CSRF cookie is seeded if missing
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      setCsrfCookie(res);
    }
    return next();
  }

  // Pure Bearer-token authenticated requests with Authorization header are not vulnerable
  // to traditional browser CSRF, as foreign origins cannot inject Authorization headers without CORS preflight.
  const hasBearerAuth = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  const enforceInTest = req.headers['x-enforce-csrf'] === 'true';

  // If request is authenticated via cookie (like /refresh or /logout) or specifically enforced:
  const isCookieMutation = Boolean(req.cookies?.gb_refresh) || enforceInTest;

  if (isCookieMutation && !hasBearerAuth) {
    if (process.env.NODE_ENV === 'test' && !enforceInTest) {
      return next();
    }

    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_INVALID',
          message: 'Cross-Site Request Forgery verification failed. Missing or invalid CSRF token.',
        },
      });
    }
  }

  next();
}

module.exports = {
  CSRF_COOKIE_NAME,
  generateCsrfToken,
  setCsrfCookie,
  csrfProtection,
};
