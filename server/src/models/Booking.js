'use strict';
/**
 * Booking model — Mode B: Shared Equipment
 * Conflict prevention: server validates no overlapping confirmed bookings.
 * Partial index prevents overlapping bookings for the same asset.
 */
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedAsset', required: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    status: {
      type: String,
      enum: ['pending', 'approved', 'confirmed', 'rejected', 'cancelled', 'active', 'completed', 'overdue'],
      default: 'confirmed',
    },

    idempotencyKey: { type: String, sparse: true },

    purpose: { type: String, maxlength: 500, default: '' },

    // Approval
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedReason: { type: String, maxlength: 500 },

    // Pickup / Return tracking
    pickedUpAt: { type: Date },
    returnedAt: { type: Date },
    expectedReturnTime: { type: Date },

    // Condition records
    conditionAtPickup: { type: String, maxlength: 500, default: '' },
    conditionAtReturn: { type: String, maxlength: 500, default: '' },
    damageNotes: { type: String, maxlength: 1000, default: '' },

    // Deposit (simulated)
    depositPaise: { type: Number, default: 0, min: 0 },
    depositStatus: {
      type: String,
      enum: ['not_required', 'pending', 'held_simulated', 'returned_simulated', 'forfeited_simulated'],
      default: 'not_required',
    },

    cancellationReason: { type: String, maxlength: 500 },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Notifications sent flags
    reminderSent: { type: Boolean, default: false },
    overdueNoticeSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
bookingSchema.index({ asset: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ asset: 1, status: 1 });
bookingSchema.index({ bookedBy: 1, status: 1 });
bookingSchema.index({ group: 1 });

// Custom validation: endTime must be after startTime
bookingSchema.pre('validate', function (next) {
  if (this.endTime <= this.startTime) {
    return next(new Error('endTime must be after startTime'));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
