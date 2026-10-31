'use strict';
const express = require('express');
const User = require('../models/User');
const { optionalAuthenticate, authenticate } = require('../middleware/auth');
const { requireSelfOrAdmin, isValidObjectId } = require('../middleware/authorize');
const AppError = require('../utils/AppError');

const router = express.Router();

/**
 * Get public profile of a user.
 * Strictly respects profileVisibility, showEmail, and showBudget.
 */
router.get('/:userId', optionalAuthenticate, async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return next(new AppError('Invalid user ID parameter.', 400, 'INVALID_ID'));
    }

    const targetUser = await User.findById(userId);
    if (!targetUser || !targetUser.isActive) {
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }

    const sanitized = targetUser.toSanitizedProfile(req.user);
    res.json({ success: true, data: sanitized });
  } catch (err) {
    next(err);
  }
});

/**
 * Update user account (self or admin guard).
 */
router.patch('/:userId', authenticate, requireSelfOrAdmin('userId'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    }

    const allowedUpdates = [
      'displayName', 'bio', 'avatarUrl', 'interests', 'skills',
      'preferredAssetCategories', 'budgetRangeMinPaise', 'budgetRangeMaxPaise',
      'city', 'state', 'country', 'profileVisibility', 'showEmail', 'showBudget',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();
    res.json({ success: true, data: user.toSanitizedProfile(req.user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
