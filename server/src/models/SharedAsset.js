'use strict';
/**
 * SharedAsset model — Mode B: Group-owned shared equipment and assets.
 * Tracks equipment inventory, maintenance blocks, booking rules, and active reservations ledger.
 */
const mongoose = require('mongoose');

const activeReservationSubSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'confirmed', 'active'],
      default: 'confirmed',
    },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const maintenanceBlockSubSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    reason: { type: String, maxlength: 500, default: 'Scheduled Maintenance' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const sharedAssetSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000, default: '' },
    category: { type: String, maxlength: 60, default: 'general' },
    imageUrl: { type: String, default: '' },

    // Location & access description
    locationDescription: { type: String, maxlength: 500, default: '' },

    // Usage & rules
    usageInstructions: { type: String, maxlength: 2000, default: '' },
    bookingRules: { type: String, maxlength: 2000, default: '' },
    cancellationPolicy: { type: String, maxlength: 1000, default: '' },

    // Identity
    serialNumber: { type: String, maxlength: 100, default: '' },
    assetTag: { type: String, maxlength: 100, default: '' },

    // Condition
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'needs_maintenance', 'out_of_service'],
      default: 'good',
    },
    conditionNotes: { type: String, maxlength: 1000, default: '' },

    // Availability & Lifecycle
    isAvailable: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },

    // Maintenance schedule
    lastMaintenanceAt: { type: Date },
    nextMaintenanceAt: { type: Date },
    maintenanceNotes: { type: String, maxlength: 1000, default: '' },
    maintenanceBlocks: [maintenanceBlockSubSchema],

    // Booking constraints
    minBookingDurationHours: { type: Number, default: 1, min: 1 },
    maxBookingDurationHours: { type: Number, default: 72, min: 1 },
    advanceBookingDays: { type: Number, default: 30, min: 1 },
    requiresApproval: { type: Boolean, default: false },
    depositPaise: { type: Number, default: 0, min: 0 }, // simulated deposit in paise

    // Concurrency-safe atomic reservations ledger
    // Every confirmed, approved, or pending booking occupies an interval [startTime, endTime)
    activeReservations: [activeReservationSubSchema],

    // Acquisition link
    sourcedFromProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  },
  { timestamps: true }
);

// Indexes
sharedAssetSchema.index({ group: 1, isArchived: 1, isAvailable: 1 });
sharedAssetSchema.index({ group: 1, category: 1 });

module.exports = mongoose.model('SharedAsset', sharedAssetSchema);
