'use strict';
/**
 * OwnershipRecord model — Mode A
 * Stores ownership shares in basis points (10000 = 100%).
 * Total must equal 10000 when finalized.
 * NEVER allow direct client writes to this collection.
 */
const mongoose = require('mongoose');

const ownershipRecordSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAsset', required: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Ownership in basis points (10000 = 100%)
    ownershipBasisPoints: { type: Number, required: true, min: 1, max: 10000 },

    // Contribution that led to this ownership (informational)
    contributionAmountPaise: { type: Number, default: 0 },

    // Explicit agreement — disclosed and accepted
    agreementAcceptedAt: { type: Date },
    agreementHash: { type: String, default: '' }, // hash of agreed terms

    status: {
      type: String,
      enum: ['proposed', 'agreed', 'finalized', 'transferred'],
      default: 'proposed',
    },

    finalizedAt: { type: Date },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: { type: String, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

ownershipRecordSchema.index({ group: 1, product: 1 });
ownershipRecordSchema.index({ group: 1, user: 1 });
ownershipRecordSchema.index({ product: 1, status: 1 });

module.exports = mongoose.model('OwnershipRecord', ownershipRecordSchema);
