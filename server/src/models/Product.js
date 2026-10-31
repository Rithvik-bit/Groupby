'use strict';
/**
 * Product model — Mode A: Collective Purchase
 * Tracks the item being collectively acquired.
 * Purchase confirmation is a separate explicit step.
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    category: { type: String, maxlength: 60 },
    pricePaise: { type: Number, required: true, min: 0 },
    sellerReference: { type: String, maxlength: 300, default: '' }, // URL or name
    imageUrl: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'funded', 'purchase_confirmed', 'cancelled'],
      default: 'pending',
    },

    // Set only after purchase confirmation — never automatically
    purchaseConfirmedAt: { type: Date },
    purchaseConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Asset identification after purchase
    serialNumber: { type: String, maxlength: 100, default: '' },
    assetIdentifier: { type: String, maxlength: 100, default: '' },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'poor'],
      default: 'new',
    },
  },
  { timestamps: true }
);

productSchema.index({ group: 1 });
productSchema.index({ status: 1 });

module.exports = mongoose.model('Product', productSchema);
