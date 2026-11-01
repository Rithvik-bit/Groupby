'use strict';
/**
 * Notification model
 * In-app notifications. Never expose private financial or chat details.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'group_invite', 'join_request', 'join_approved', 'join_rejected',
        'role_changed', 'member_removed', 'group_cancelled', 'member_left',
        'group_update', 'invite_revoked',
        'booking_request', 'booking_approved', 'booking_confirmed', 'booking_rejected',
        'booking_cancelled', 'booking_reminder', 'booking_overdue', 'asset_updated',
        'contribution_received', 'funding_complete', 'purchase_confirmed',
        'ownership_transfer_request', 'ownership_transfer_complete',
        'dispute_opened', 'dispute_updated',
        'chat_message', 'announcement',
        'venture_expense_approval', 'expense_approval_needed', 'expense_approved', 'expense_rejected',
        'account_verified',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true, maxlength: 100 },
    body: { type: String, maxlength: 300 },
    link: { type: String, maxlength: 500 }, // frontend route
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },

    // Related entities
    relatedGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
