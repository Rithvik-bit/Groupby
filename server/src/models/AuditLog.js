'use strict';
/**
 * AuditLog model — append-only, immutable record of important actions.
 * Critical for ownership changes, financial mutations, and access control events.
 * NEVER allow delete or update operations on this collection.
 */
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for system events
    action: { type: String, required: true, maxlength: 100 }, // e.g., 'ownership.transfer.complete'
    entityType: {
      type: String,
      enum: [
        'user', 'group', 'group_membership', 'product', 'shared_asset',
        'contribution', 'ownership_record', 'ownership_transfer',
        'booking', 'business_venture', 'financial_entry',
        'chat_message', 'dispute', 'notification', 'system',
      ],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    relatedGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },

    // Snapshot of relevant data at time of action (no passwords, no secrets)
    snapshot: { type: mongoose.Schema.Types.Mixed },

    ipAddress: { type: String, maxlength: 45 }, // IPv4/IPv6
    userAgent: { type: String, maxlength: 300 },

    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'info',
    },
  },
  {
    timestamps: true,
  }
);

// ── Enforce immutability ──────────────────────────────────────────────────────
auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndDelete'], function (next) {
  next(new Error('AuditLog is immutable — no updates or deletes allowed.'));
});

// ── Indexes ──────────────────────────────────────────────────────────────────
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ relatedGroup: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
