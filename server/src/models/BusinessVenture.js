'use strict';
/**
 * BusinessVenture model — Mode C
 * Collaborative business projects with ledger, roles, and financial reporting.
 * NOT a legally registered entity unless separately established.
 */
const mongoose = require('mongoose');

const businessVentureSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 3000 },
    objectives: [{ type: String, maxlength: 300 }],

    ventureType: {
      type: String,
      enum: [
        'printing_center', 'photography_service', 'printing_service_3d',
        'equipment_rental', 'agriculture', 'workshop', 'other',
      ],
      default: 'other',
    },

    status: {
      type: String,
      enum: ['planning', 'active', 'suspended', 'closed'],
      default: 'planning',
    },

    founders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Financial summary (cached, recomputed from FinancialEntry)
    totalRevenuePaise: { type: Number, default: 0, min: 0 },
    totalExpensePaise: { type: Number, default: 0, min: 0 },
    reservedFundsPaise: { type: Number, default: 0, min: 0 },

    // Approval threshold for large expenses (in paise)
    expenseApprovalThresholdPaise: { type: Number, default: 100000 }, // ₹1000

    // Surplus allocation rules (text description)
    surplusAllocationRules: { type: String, maxlength: 2000, default: '' },

    // Exit and dispute rules
    exitRules: { type: String, maxlength: 2000, default: '' },

    legalDisclaimer: {
      type: String,
      default:
        'This venture is a collaborative record-keeping tool. It does not constitute a legally registered business or investment vehicle.',
    },
  },
  { timestamps: true }
);

businessVentureSchema.index({ group: 1 });
businessVentureSchema.index({ status: 1 });

module.exports = mongoose.model('BusinessVenture', businessVentureSchema);
