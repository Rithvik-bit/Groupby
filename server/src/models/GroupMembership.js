'use strict';
/**
 * GroupMembership model
 * Tracks every user's relationship to every group.
 * Role-based access enforced here, not just on User.
 */
const mongoose = require('mongoose');

const groupMembershipSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member', 'viewer', 'pending', 'invited'],
      default: 'member',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'invited', 'rejected', 'declined', 'left', 'removed', 'banned', 'revoked', 'expired'],
      default: 'active',
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inviteToken: { type: String, select: false },
    inviteTokenHash: { type: String, select: false },
    inviteExpiresAt: { type: Date },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    removedAt: { type: Date },
    removalReason: { type: String, maxlength: 300 },
    roleChangedAt: { type: Date },
    banReason: { type: String, select: false },

    // Contribution commitment
    agreedContributionPaise: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
groupMembershipSchema.index({ group: 1, user: 1 }, { unique: true });
groupMembershipSchema.index({ user: 1, status: 1 });
groupMembershipSchema.index({ group: 1, status: 1 });

module.exports = mongoose.model('GroupMembership', groupMembershipSchema);
