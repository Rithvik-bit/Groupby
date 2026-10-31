'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation error handler
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input.', details: errors.array() },
    });
  }
  next();
}

const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_.-]+$/),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  body('displayName').optional().isLength({ max: 60 }).trim().escape(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const passwordValidation = [
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
];

// ── Public Routes ─────────────────────────────────────────────────────────────
router.get('/csrf-token', authController.getCsrfToken);
router.post('/register', authLimiter, registerValidation, validate, authController.register);
router.post('/login', authLimiter, loginValidation, validate, authController.login);
router.post('/refresh', csrfProtection, authController.refresh);
router.post('/logout', csrfProtection, authController.logout);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/forgot-password', authLimiter, body('email').isEmail().normalizeEmail(), validate, authController.forgotPassword);
router.post('/reset-password/:token', authLimiter, passwordValidation, validate, authController.resetPassword);

// ── Authenticated Routes ──────────────────────────────────────────────────────
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, authController.updateProfile);
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);
router.post('/deactivate', authenticate, authController.deactivateAccount);

module.exports = router;
