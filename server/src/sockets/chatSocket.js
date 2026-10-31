'use strict';
/**
 * Socket.IO chat handler.
 * CRITICAL: membership is verified server-side for EVERY join and message event.
 * Private rooms are NOT joinable merely by knowing the room ID.
 */
const ChatMessage = require('../models/ChatMessage');
const GroupMembership = require('../models/GroupMembership');
const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');

const MESSAGE_MAX_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const RATE_LIMIT_MAX_MESSAGES = 10;

// Per-socket rate limiter
const rateLimiter = new Map(); // socketId -> { count, resetAt }

function checkRateLimit(socketId) {
  const now = Date.now();
  const entry = rateLimiter.get(socketId);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(socketId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX_MESSAGES) return false;
  entry.count++;
  return true;
}

async function verifyMembership(userId, groupId) {
  const membership = await GroupMembership.findOne({
    user: userId, group: groupId, status: 'active',
  });
  return membership;
}

function setupChatSocket(io) {
  // Auth middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.sub).select('isActive isBanned username displayName avatarUrl');
      if (!user || !user.isActive || user.isBanned) return next(new Error('Account inactive'));
      socket.userId = decoded.sub;
      socket.userInfo = { id: decoded.sub, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.userId}`);

    // ── Join group room ────────────────────────────────────────────────────
    socket.on('join_group', async ({ groupId }) => {
      try {
        if (!groupId) return socket.emit('error', { message: 'groupId required' });

        // Server-side membership check — cannot be bypassed by client
        const membership = await verifyMembership(socket.userId, groupId);
        if (!membership) {
          return socket.emit('error', { message: 'Not a member of this group' });
        }

        const room = `group:${groupId}`;
        socket.join(room);
        socket.emit('joined_group', { groupId });
        console.log(`[Socket] User ${socket.userId} joined room ${room}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    // ── Send message ───────────────────────────────────────────────────────
    socket.on('send_message', async ({ groupId, content, messageType = 'text' }) => {
      try {
        if (!groupId || !content) return socket.emit('error', { message: 'groupId and content required' });

        // Rate limit
        if (!checkRateLimit(socket.id)) {
          return socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
        }

        // Size limit
        if (typeof content !== 'string' || content.length > MESSAGE_MAX_LENGTH) {
          return socket.emit('error', { message: `Message too long. Max ${MESSAGE_MAX_LENGTH} characters.` });
        }

        const sanitizedContent = content.trim();
        if (!sanitizedContent) return socket.emit('error', { message: 'Empty message' });

        // Re-verify membership (not just room presence)
        const membership = await verifyMembership(socket.userId, groupId);
        if (!membership) {
          socket.leave(`group:${groupId}`);
          return socket.emit('error', { message: 'Membership revoked' });
        }

        const allowedTypes = ['text', 'product_link', 'booking_ref'];
        const safeType = allowedTypes.includes(messageType) ? messageType : 'text';

        const message = await ChatMessage.create({
          group: groupId,
          sender: socket.userId,
          content: sanitizedContent,
          messageType: safeType,
        });

        const populated = await message.populate('sender', 'username displayName avatarUrl');

        // Only broadcast to THIS group room — not all sockets
        io.to(`group:${groupId}`).emit('new_message', populated);
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicators ──────────────────────────────────────────────────
    socket.on('typing_start', async ({ groupId }) => {
      const membership = await verifyMembership(socket.userId, groupId).catch(() => null);
      if (!membership) return;
      socket.to(`group:${groupId}`).emit('user_typing', { userId: socket.userId, userInfo: socket.userInfo });
    });

    socket.on('typing_stop', ({ groupId }) => {
      socket.to(`group:${groupId}`).emit('user_stopped_typing', { userId: socket.userId });
    });

    // ── Leave room ─────────────────────────────────────────────────────────
    socket.on('leave_group', ({ groupId }) => {
      socket.leave(`group:${groupId}`);
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      rateLimiter.delete(socket.id);
      console.log(`[Socket] Disconnected: ${socket.userId}`);
    });
  });
}

module.exports = { setupChatSocket };
