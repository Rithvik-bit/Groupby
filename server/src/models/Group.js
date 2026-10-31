'use strict';
/**
 * Group model
 * Supports three modes: collective_purchase, shared_equipment, business_venture
 * Financial amounts stored as integer paise.
 */
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 2000 },
    slug: { type: String, unique: true, lowercase: true },

    groupType: {
      type: String,
      enum: ['collective_purchase', 'shared_equipment', 'business_venture'],
      required: true,
    },

    category: {
      type: String,
      required: true,
      enum: [
        'electronics', 'photography', 'printing', 'agriculture',
        'workshop', 'vehicles', 'real_estate', 'services', 'other',
      ],
    },

    status: {
      type: String,
      enum: ['draft', 'open', 'funding', 'funded', 'purchasing', 'active', 'completed', 'cancelled'],
      default: 'open',
    },

    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Membership limits
    minMembers: { type: Number, default: 2, min: 2 },
    maxMembers: { type: Number, default: 20, min: 2 },

    // Funding (paise)
    targetAmountPaise: { type: Number, default: 0, min: 0 },
    currentAmountPaise: { type: Number, default: 0, min: 0 },
    minContributionPaise: { type: Number, default: 0, min: 0 },
    maxContributionPaise: { type: Number, default: 0, min: 0 },

    fundingDeadline: { type: Date },
    rules: { type: String, maxlength: 2000, default: '' },
    cancellationRules: { type: String, maxlength: 1000, default: '' },

    // Location (coarse)
    city: { type: String, maxlength: 60, default: '' },
    state: { type: String, maxlength: 60, default: '' },
    country: { type: String, maxlength: 60, default: '' },

    // Invite link
    inviteCode: { type: String, unique: true, sparse: true },

    // Tags
    tags: [{ type: String, maxlength: 30 }],

    // Member count cached for queries
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
groupSchema.index({ status: 1, visibility: 1 });
groupSchema.index({ category: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ groupType: 1 });
groupSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Group', groupSchema);
