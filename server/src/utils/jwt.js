'use strict';
/**
 * JWT & Cryptographic Token Utilities
 * Access token: short-lived (15m), stored in memory on client.
 * Refresh token: long-lived (7d), stored in HttpOnly SameSite=Strict cookie with family tracking.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const isProd = process.env.NODE_ENV === 'production';
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || (isProd ? null : 'dev_access_secret_change_in_prod');
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (isProd ? null : 'dev_refresh_secret_change_in_prod');
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (isProd && (!ACCESS_SECRET || !REFRESH_SECRET || ACCESS_SECRET.includes('dev_') || REFRESH_SECRET.includes('dev_'))) {
  throw new Error('Fatal: Insecure or missing JWT secrets in production environment!');
}

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

/**
 * Generate a SHA-256 hash of a token for secure database storage.
 * Used for refresh tokens, verification tokens, and password reset tokens.
 * @param {string} token
 * @returns {string} Hex encoded hash
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
};
