'use strict';
/**
 * FinancialEntry model — Mode C business venture ledger
 * Records expenses and revenues. Significant expenses require member approval.
 * Amounts in integer paise.
 */
const mongoose = require('mongoose');

const financialEntrySchema = new mongoose.Schema(
  {
    venture: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessVenture', required: false, default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    entryType: {
      type: String,
      enum: ['revenue', 'expense', 'refund', 'distribution'],
      required: true,
    },

    amountPaise: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, maxlength: 500 },
    category: { type: String, maxlength: 60, default: 'general' },

    documentReference: { type: String, maxlength: 500, default: '' }, // receipt URL or note

    // Approval workflow for large expenses
    requiresApproval: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['not_required', 'pending', 'approved', 'rejected'],
      default: 'not_required',
    },
    approvals: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        decision: { type: String, enum: ['approved', 'rejected'] },
        note: { type: String, maxlength: 300 },
        decidedAt: { type: Date },
      },
    ],

    isVerified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Treat all entries as claims until verified
    disclaimer: {
      type: String,
      default: '[SIMULATED] This entry is a recorded claim and has not been independently verified.',
    },

    entryDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

financialEntrySchema.index({ venture: 1, entryDate: -1 });
financialEntrySchema.index({ venture: 1, entryType: 1 });
financialEntrySchema.index({ group: 1 });

module.exports = mongoose.model('FinancialEntry', financialEntrySchema);
