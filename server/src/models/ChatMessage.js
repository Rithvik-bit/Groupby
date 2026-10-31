'use strict';
/**
 * ChatMessage model
 * Member-only messages. Room membership verified server-side before delivery.
 * No message content exposed to non-members under any circumstance.
 */
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    content: { type: String, required: true, maxlength: 2000 },
    messageType: {
      type: String,
      enum: ['text', 'announcement', 'system', 'product_link', 'booking_ref'],
      default: 'text',
    },

    // Optional references
    productRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    bookingRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },

    // Delivery
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date },
      },
    ],

    // Moderation
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isFlagged: { type: Boolean, default: false },

    // Edit history (append-only)
    editedAt: { type: Date },
    originalContent: { type: String, select: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ group: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ group: 1, isDeleted: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
