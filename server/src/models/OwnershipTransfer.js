'use strict';
/**
 * OwnershipTransfer model
 * Immutable audit trail. Never allow direct DB updates from client.
 * Finalized transfers only written after ALL required approvals confirmed.
 */
const mongoose = require('mongoose');

const ownershipTransferSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAsset', required: false },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    basisPointsToTransfer: { type: Number, required: true, min: 1, max: 10000 },
    proposedPricePaise: { type: Number, default: 0, min: 0 },

    status: {
      type: String,
      enum: ['proposed', 'awaiting_buyer', 'awaiting_approval', 'approved', 'completed', 'rejected', 'cancelled'],
      default: 'proposed',
    },

    // Required approvals (e.g., group admin must also sign off)
    requiredApprovals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    approvals: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        decision: { type: String, enum: ['approved', 'rejected'] },
        note: { type: String, maxlength: 300 },
        decidedAt: { type: Date },
      },
    ],

    // Completion
    completedAt: { type: Date },

    // Source ownership record
    sourceOwnershipRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnershipRecord' },

    // Audit note
    auditNote: { type: String, maxlength: 500 },

    disclaimer: {
      type: String,
      default:
        'This transfer is recorded in-app only. It does not automatically transfer legal title to physical property.',
    },
  },
  {
    timestamps: true,
    // Enforce append-only on status field by catching direct status patches in middleware
  }
);

ownershipTransferSchema.index({ group: 1, status: 1 });
ownershipTransferSchema.index({ fromUser: 1 });
ownershipTransferSchema.index({ toUser: 1 });
ownershipTransferSchema.index({ product: 1 });

module.exports = mongoose.model('OwnershipTransfer', ownershipTransferSchema);
