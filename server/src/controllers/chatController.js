'use strict';
/**
 * Chat controller — REST endpoints for message history and moderation.
 * Real-time delivery handled by Socket.IO (sockets/chatSocket.js).
 * Membership verified server-side on every request.
 */
const ChatMessage = require('../models/ChatMessage');
const GroupMembership = require('../models/GroupMembership');
const AppError = require('../utils/AppError');

async function getMessages(req, res, next) {
  try {
    const { groupId } = req.params;
    const { before, limit = 50 } = req.query;

    const filter = { group: groupId, isDeleted: false };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await ChatMessage.find(filter)
      .populate('sender', 'username displayName avatarUrl')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: messages.reverse() }); // chronological order
  } catch (err) {
    next(err);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const message = await ChatMessage.findById(messageId);
    if (!message) return next(new AppError('Message not found.', 404, 'NOT_FOUND'));

    // Only sender or group admin can delete
    const isSender = message.sender.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const isGroupAdmin = req.membership && ['admin', 'moderator'].includes(req.membership.role);

    if (!isSender && !isAdmin && !isGroupAdmin) {
      return next(new AppError('Not authorized.', 403, 'FORBIDDEN'));
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user.id;
    message.content = '[Message deleted]';
    await message.save();

    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
}

async function reportMessage(req, res, next) {
  try {
    const { messageId } = req.params;
    const message = await ChatMessage.findById(messageId);
    if (!message) return next(new AppError('Message not found.', 404, 'NOT_FOUND'));

    if (!message.reportedBy.includes(req.user.id)) {
      message.reportedBy.push(req.user.id);
      if (message.reportedBy.length >= 3) message.isFlagged = true;
      await message.save();
    }

    res.json({ success: true, message: 'Message reported.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMessages, deleteMessage, reportMessage };
