'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { requireMembership, requireGroupAdmin } = require('../middleware/membership');
const chatCtrl = require('../controllers/chatController');

const router = express.Router({ mergeParams: true });

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, max: 60,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
  standardHeaders: true, legacyHeaders: false,
});

// Get message history — members only
router.get('/', authenticate, requireMembership(), chatLimiter, chatCtrl.getMessages);

// Delete message
router.delete('/:messageId', authenticate, requireMembership(), chatCtrl.deleteMessage);

// Report message
router.post('/:messageId/report', authenticate, requireMembership(), chatLimiter, chatCtrl.reportMessage);

module.exports = router;
