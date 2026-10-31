'use strict';
/**
 * Dispute model
 * Tracks member disputes within groups or ventures.
 */
const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    against: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    type: {
      type: String,
      enum: ['ownership', 'contribution', 'booking', 'conduct', 'financial', 'exit', 'other'],
      required: true,
    },

    title: { type: String, required: true, maxlength: 150 },
    description: { type: String, required: true, maxlength: 3000 },

    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed', 'escalated'],
      default: 'open',
    },

    resolution: { type: String, maxlength: 2000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },

    // Related entities
    relatedBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    relatedTransfer: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnershipTransfer' },
    relatedContribution: { type: mongoose.Schema.Types.ObjectId, ref: 'Contribution' },

    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: { type: String, maxlength: 1000 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

disputeSchema.index({ group: 1, status: 1 });
disputeSchema.index({ raisedBy: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
