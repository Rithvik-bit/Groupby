'use strict';
/**
 * Contribution model
 * Immutable ledger entries — append-only by design.
 * Amounts in integer paise. No floating-point arithmetic.
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const contributionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    venture: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessVenture' },

    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },

    type: {
      type: String,
      enum: ['contribution', 'reversal', 'refund', 'deposit', 'deposit_return'],
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'simulated_success', 'failed', 'reversed', 'cancelled'],
      default: 'pending',
    },

    // Idempotency key — prevents duplicate processing
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
    },

    // Payment provider abstraction (simulated in dev)
    paymentProvider: { type: String, default: 'simulated' },
    paymentReference: { type: String, default: '' },

    note: { type: String, maxlength: 500, default: '' },
    processedAt: { type: Date },

    // CLEARLY labeled as simulated
    isSimulated: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Prevent any updates to existing documents after creation
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
contributionSchema.index({ group: 1, user: 1 });
contributionSchema.index({ group: 1, status: 1 });
contributionSchema.index({ user: 1, createdAt: -1 });

// Prevent updates (append-only pattern)
contributionSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const err = new Error('Contribution records are append-only and cannot be updated.');
  next(err);
});

module.exports = mongoose.model('Contribution', contributionSchema);
