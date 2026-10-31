'use strict';
/**
 * Notification Controller
 * Manages user in-app notifications.
 * Never exposes notification records belonging to other users.
 */
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

async function getMyNotifications(req, res, next) {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const filter = { recipient: req.user.id };
    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.isRead = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('relatedGroup', 'title slug groupType visibility')
        .populate('relatedUser', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user.id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return next(new AppError('Notification not found or unauthorized.', 404, 'NOT_FOUND'));
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
