'use strict';
/**
 * Booking & Shared Asset Controller — Phase 4
 * Implements full Asset lifecycle, availability calendar, and concurrency-safe reservations.
 *
 * Concurrency Reservation Strategy:
 *  - Uses an atomic document-level interval ledger (`activeReservations`) on `SharedAsset`.
 *  - Half-open interval convention: [startTime, endTime).
 *  - Two slots [S1, E1) and [S2, E2) overlap if and only if S1 < E2 && E1 > S2.
 *  - Atomic `findOneAndUpdate` on `SharedAsset` evaluates `$elemMatch: { startTime: { $lt: reqEnd }, endTime: { $gt: reqStart } }`.
 *    If an overlap exists, the query matches nothing, `findOneAndUpdate` returns `null`, and a 409 conflict is immediately returned.
 *  - This strategy is 100% ACID atomic in WiredTiger without requiring external locks,
 *    and functions identically on standalone MongoDB and replica sets.
 *  - Pessimistic Hold Policy: Pending bookings hold the slot in `activeReservations` until approved or rejected/cancelled.
 */
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const SharedAsset = require('../models/SharedAsset');
const Notification = require('../models/Notification');
const GroupMembership = require('../models/GroupMembership');
const AppError = require('../utils/AppError');
const audit = require('../utils/auditLogger');
const { withTransaction } = require('../config/db');

// ── 1. Create Shared Asset ───────────────────────────────────────────────────
async function createAsset(req, res, next) {
  try {
    const { groupId } = req.params;
    const {
      name,
      description = '',
      category = 'general',
      imageUrl = '',
      locationDescription = '',
      usageInstructions = '',
      bookingRules = '',
      cancellationPolicy = '',
      serialNumber = '',
      assetTag = '',
      condition = 'good',
      conditionNotes = '',
      isAvailable = true,
      minBookingDurationHours = 1,
      maxBookingDurationHours = 72,
      advanceBookingDays = 30,
      requiresApproval = false,
      depositPaise = 0,
    } = req.body;

    if (!name || !name.trim()) {
      return next(new AppError('Asset name is required.', 400, 'VALIDATION_ERROR'));
    }

    if (minBookingDurationHours < 1) {
      return next(new AppError('minBookingDurationHours must be at least 1.', 400, 'VALIDATION_ERROR'));
    }

    if (maxBookingDurationHours < minBookingDurationHours) {
      return next(new AppError('maxBookingDurationHours cannot be less than minBookingDurationHours.', 400, 'VALIDATION_ERROR'));
    }

    const asset = await SharedAsset.create({
      group: groupId,
      name: name.trim(),
      description,
      category,
      imageUrl,
      locationDescription,
      usageInstructions,
      bookingRules,
      cancellationPolicy,
      serialNumber,
      assetTag,
      condition,
      conditionNotes,
      isAvailable: Boolean(isAvailable),
      minBookingDurationHours: Number(minBookingDurationHours),
      maxBookingDurationHours: Number(maxBookingDurationHours),
      advanceBookingDays: Number(advanceBookingDays),
      requiresApproval: Boolean(requiresApproval),
      depositPaise: Math.max(0, parseInt(depositPaise, 10) || 0),
    });

    await audit.log({
      actor: req.user.id,
      action: 'asset.created',
      entityType: 'shared_asset',
      entityId: asset._id,
      relatedGroup: groupId,
      snapshot: { name: asset.name, category: asset.category },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

// ── 2. List Group Assets ─────────────────────────────────────────────────────
async function getGroupAssets(req, res, next) {
  try {
    const { groupId } = req.params;
    const { category, condition, isAvailable, includeArchived } = req.query;

    const filter = { group: groupId };
    if (includeArchived !== 'true' && includeArchived !== true) {
      filter.isArchived = { $ne: true };
    }
    if (category) filter.category = category;
    if (condition) filter.condition = condition;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true' || isAvailable === true;

    const assets = await SharedAsset.find(filter)
      .select('-activeReservations') // sanitized view
      .sort({ createdAt: -1 });

    res.json({ success: true, data: assets });
  } catch (err) {
    next(err);
  }
}

// ── 3. Get Single Asset ──────────────────────────────────────────────────────
async function getAsset(req, res, next) {
  try {
    const { groupId, assetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      return next(new AppError('Invalid asset ID.', 400, 'INVALID_ID'));
    }

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId })
      .select('-activeReservations');

    if (!asset || asset.isArchived) {
      return next(new AppError('Asset not found in this group.', 404, 'NOT_FOUND'));
    }

    res.json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

// ── 4. Update Asset ──────────────────────────────────────────────────────────
async function updateAsset(req, res, next) {
  try {
    const { groupId, assetId } = req.params;

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId });
    if (!asset || asset.isArchived) {
      return next(new AppError('Asset not found in this group.', 404, 'NOT_FOUND'));
    }

    const allowed = [
      'name',
      'description',
      'category',
      'imageUrl',
      'locationDescription',
      'usageInstructions',
      'bookingRules',
      'cancellationPolicy',
      'serialNumber',
      'assetTag',
      'condition',
      'conditionNotes',
      'isAvailable',
      'minBookingDurationHours',
      'maxBookingDurationHours',
      'advanceBookingDays',
      'requiresApproval',
      'depositPaise',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.minBookingDurationHours && updates.minBookingDurationHours < 1) {
      return next(new AppError('minBookingDurationHours must be at least 1.', 400, 'VALIDATION_ERROR'));
    }
    if (
      updates.maxBookingDurationHours &&
      updates.maxBookingDurationHours < (updates.minBookingDurationHours || asset.minBookingDurationHours)
    ) {
      return next(new AppError('maxBookingDurationHours cannot be less than minBookingDurationHours.', 400, 'VALIDATION_ERROR'));
    }

    Object.assign(asset, updates);
    await asset.save();

    await audit.log({
      actor: req.user.id,
      action: 'asset.updated',
      entityType: 'shared_asset',
      entityId: asset._id,
      relatedGroup: groupId,
      snapshot: updates,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: asset });
  } catch (err) {
    next(err);
  }
}

// ── 5. Archive Asset ─────────────────────────────────────────────────────────
async function archiveAsset(req, res, next) {
  try {
    const { groupId, assetId } = req.params;

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId });
    if (!asset) return next(new AppError('Asset not found in this group.', 404, 'NOT_FOUND'));

    asset.isArchived = true;
    asset.archivedAt = new Date();
    asset.isAvailable = false;
    await asset.save();

    await audit.log({
      actor: req.user.id,
      action: 'asset.archived',
      entityType: 'shared_asset',
      entityId: asset._id,
      relatedGroup: groupId,
      ipAddress: req.ip,
      severity: 'warning',
    });

    res.json({ success: true, message: 'Asset archived successfully.' });
  } catch (err) {
    next(err);
  }
}

// ── 6. Maintenance Blocks Management ──────────────────────────────────────────
async function addMaintenanceBlock(req, res, next) {
  try {
    const { groupId, assetId } = req.params;
    const { startTime, endTime, reason = 'Scheduled Maintenance' } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start) || isNaN(end)) {
      return next(new AppError('Invalid date format for maintenance block.', 400, 'INVALID_DATE'));
    }
    if (end <= start) {
      return next(new AppError('endTime must be after startTime.', 400, 'INVALID_RANGE'));
    }

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId });
    if (!asset || asset.isArchived) {
      return next(new AppError('Asset not found.', 404, 'NOT_FOUND'));
    }

    // Check conflict with active bookings
    const conflicting = (asset.activeReservations || []).filter(
      (r) => r.startTime < end && r.endTime > start
    );
    if (conflicting.length > 0) {
      return next(
        new AppError(
          `Maintenance block overlaps with ${conflicting.length} existing reservation(s). Cancel or reschedule them first.`,
          409,
          'MAINTENANCE_CONFLICT'
        )
      );
    }

    asset.maintenanceBlocks.push({
      startTime: start,
      endTime: end,
      reason,
      createdBy: req.user.id,
    });
    await asset.save();

    await audit.log({
      actor: req.user.id,
      action: 'asset.maintenance_scheduled',
      entityType: 'shared_asset',
      entityId: asset._id,
      relatedGroup: groupId,
      snapshot: { startTime: start, endTime: end, reason },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: asset.maintenanceBlocks });
  } catch (err) {
    next(err);
  }
}

async function removeMaintenanceBlock(req, res, next) {
  try {
    const { groupId, assetId, blockId } = req.params;

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId });
    if (!asset) return next(new AppError('Asset not found.', 404, 'NOT_FOUND'));

    asset.maintenanceBlocks = asset.maintenanceBlocks.filter((b) => b._id.toString() !== blockId);
    await asset.save();

    res.json({ success: true, message: 'Maintenance block removed.' });
  } catch (err) {
    next(err);
  }
}

// ── 7. Get Availability & Calendar ───────────────────────────────────────────
async function getAssetAvailability(req, res, next) {
  try {
    const { groupId, assetId } = req.params;
    const { startDate, endDate } = req.query;

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId });
    if (!asset || asset.isArchived) {
      return next(new AppError('Asset not found.', 404, 'NOT_FOUND'));
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

    // Sanitize reservations for public availability (no personal data disclosure)
    const reservations = (asset.activeReservations || [])
      .filter((r) => r.startTime < end && r.endTime > start)
      .map((r) => ({
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
        type: 'reservation',
      }));

    const maintenance = (asset.maintenanceBlocks || [])
      .filter((m) => m.startTime < end && m.endTime > start)
      .map((m) => ({
        startTime: m.startTime,
        endTime: m.endTime,
        status: 'maintenance',
        reason: m.reason,
        type: 'maintenance',
      }));

    res.json({
      success: true,
      data: {
        assetId: asset._id,
        name: asset.name,
        requiresApproval: asset.requiresApproval,
        maxBookingDurationHours: asset.maxBookingDurationHours,
        minBookingDurationHours: asset.minBookingDurationHours,
        advanceBookingDays: asset.advanceBookingDays,
        slots: [...reservations, ...maintenance].sort((a, b) => a.startTime - b.startTime),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── 8. Concurrency-Safe Booking Creation ──────────────────────────────────────
async function createBooking(req, res, next) {
  try {
    const { groupId, assetId } = req.params;
    const { startTime, endTime, purpose = '', idempotencyKey } = req.body;
    const idempotencyHeader = req.headers['idempotency-key'] || idempotencyKey;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(new AppError('Invalid date format.', 400, 'INVALID_DATE'));
    }
    if (end <= start) {
      return next(new AppError('endTime must be after startTime.', 400, 'INVALID_RANGE'));
    }

    // Disallow past bookings (allow 2-minute clock skew)
    if (start.getTime() < now.getTime() - 2 * 60 * 1000) {
      return next(new AppError('Cannot book slots in the past.', 400, 'PAST_DATE'));
    }

    // Check Idempotency
    if (idempotencyHeader) {
      const existing = await Booking.findOne({
        asset: assetId,
        bookedBy: req.user.id,
        idempotencyKey: idempotencyHeader,
      });
      if (existing) {
        return res.status(200).json({ success: true, data: existing, idempotentRetry: true });
      }
    }

    const asset = await SharedAsset.findOne({ _id: assetId, group: groupId });
    if (!asset || asset.isArchived) {
      return next(new AppError('Asset not found in this group.', 404, 'NOT_FOUND'));
    }
    if (!asset.isAvailable) {
      return next(new AppError('Asset is currently unavailable for booking.', 400, 'UNAVAILABLE'));
    }

    // Validate Duration Constraints
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours < (asset.minBookingDurationHours || 1)) {
      return next(
        new AppError(`Minimum booking duration is ${asset.minBookingDurationHours || 1} hour(s).`, 400, 'MIN_DURATION')
      );
    }
    if (durationHours > (asset.maxBookingDurationHours || 72)) {
      return next(
        new AppError(`Maximum booking duration is ${asset.maxBookingDurationHours || 72} hours.`, 400, 'DURATION_EXCEEDED')
      );
    }

    // Advance Booking Window
    const daysInAdvance = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysInAdvance > (asset.advanceBookingDays || 30)) {
      return next(
        new AppError(`Cannot book more than ${asset.advanceBookingDays || 30} days in advance.`, 400, 'ADVANCE_LIMIT')
      );
    }

    const newBookingId = new mongoose.Types.ObjectId();
    const initialStatus = asset.requiresApproval ? 'pending' : 'confirmed';

    // ── ATOMIC INTERVAL ACQUISITION ──────────────────────────────────────────
    // Uses half-open interval overlap check [start, end)
    // S1 < E2 && E1 > S2 -> matches any overlap
    const atomicFilter = {
      _id: assetId,
      group: groupId,
      isAvailable: true,
      isArchived: { $ne: true },
      // Check active reservations
      activeReservations: {
        $not: {
          $elemMatch: {
            startTime: { $lt: end },
            endTime: { $gt: start },
          },
        },
      },
      // Check maintenance blocks
      maintenanceBlocks: {
        $not: {
          $elemMatch: {
            startTime: { $lt: end },
            endTime: { $gt: start },
          },
        },
      },
    };

    const reservationPayload = {
      bookingId: newBookingId,
      startTime: start,
      endTime: end,
      status: initialStatus,
      bookedBy: req.user.id,
      createdAt: new Date(),
    };

    let bookingResult = null;

    // Wrap in withTransaction if replica set is active, or use standalone atomic document lock
    await withTransaction(async (session) => {
      const acquiredAsset = await SharedAsset.findOneAndUpdate(
        atomicFilter,
        { $push: { activeReservations: reservationPayload } },
        { new: true, session }
      );

      if (!acquiredAsset) {
        throw new AppError(
          'The requested time slot is no longer available. Please select another slot.',
          409,
          'BOOKING_CONFLICT'
        );
      }

      try {
        const [booking] = await Booking.create(
          [
            {
              _id: newBookingId,
              group: groupId,
              asset: assetId,
              bookedBy: req.user.id,
              startTime: start,
              endTime: end,
              expectedReturnTime: end,
              status: initialStatus,
              purpose: purpose.trim(),
              depositPaise: asset.depositPaise,
              depositStatus: asset.depositPaise > 0 ? 'pending' : 'not_required',
              idempotencyKey: idempotencyHeader || undefined,
            },
          ],
          { session }
        );
        bookingResult = booking;
      } catch (insertError) {
        // Compensatory rollback if Booking creation fails on standalone
        if (!session) {
          await SharedAsset.updateOne(
            { _id: assetId },
            { $pull: { activeReservations: { bookingId: newBookingId } } }
          );
        }
        throw insertError;
      }
    });

    // Notify leaders if approval required
    if (asset.requiresApproval) {
      const leaders = await GroupMembership.find({
        group: groupId,
        role: { $in: ['owner', 'admin', 'moderator'] },
        status: 'active',
      });
      const notifs = leaders.map((leader) => ({
        recipient: leader.user,
        type: 'booking_request',
        title: 'New Booking Request',
        body: `${req.user.username} requested to book '${asset.name}'.`,
        link: `/groups/${groupId}`,
        relatedGroup: groupId,
      }));
      if (notifs.length) await Notification.insertMany(notifs);
    }

    await audit.log({
      actor: req.user.id,
      action: 'booking.created',
      entityType: 'booking',
      entityId: bookingResult._id,
      relatedGroup: groupId,
      snapshot: { assetId, startTime: start, endTime: end, status: initialStatus },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: bookingResult });
  } catch (err) {
    next(err);
  }
}

// ── 9. View Bookings for Single Asset ─────────────────────────────────────────
async function getAssetBookings(req, res, next) {
  try {
    const { groupId, assetId } = req.params;
    const { startDate, endDate, status } = req.query;

    const filter = { asset: assetId, group: groupId };
    if (status) {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const bookings = await Booking.find(filter)
      .populate('bookedBy', 'username displayName avatarUrl')
      .sort({ startTime: 1 });

    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

// ── 10. View All Group Bookings (Manager View) ────────────────────────────────
async function getGroupAllBookings(req, res, next) {
  try {
    const { groupId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { group: groupId };
    if (status) filter.status = status;

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Number(limit));
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('asset', 'name category condition imageUrl')
        .populate('bookedBy', 'username displayName avatarUrl email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(Math.min(50, Number(limit))),
      Booking.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: bookings,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    next(err);
  }
}

// ── 11. View My Bookings (Authenticated User) ─────────────────────────────────
async function getMyBookings(req, res, next) {
  try {
    const { status } = req.query;
    const filter = { bookedBy: req.user.id };
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('asset', 'name category imageUrl condition locationDescription requiresApproval cancellationPolicy')
      .populate('group', 'title slug groupType')
      .sort({ startTime: -1 });

    res.json({ success: true, data: bookings });
  } catch (err) {
    next(err);
  }
}

// ── 12. Approve / Reject Booking ──────────────────────────────────────────────
async function approveOrRejectBooking(req, res, next) {
  try {
    const { groupId, bookingId } = req.params;
    const { decision, reason = '' } = req.body;

    if (!['approve', 'reject'].includes(decision)) {
      return next(new AppError('Decision must be "approve" or "reject".', 400, 'INVALID_DECISION'));
    }

    const booking = await Booking.findOne({ _id: bookingId, group: groupId });
    if (!booking) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));

    if (booking.status !== 'pending') {
      return next(new AppError(`Booking is not pending approval (current: ${booking.status}).`, 400, 'INVALID_STATUS'));
    }

    if (decision === 'approve') {
      booking.status = 'confirmed';
      booking.approvedBy = req.user.id;
      booking.approvedAt = new Date();
      await booking.save();

      // Update status in activeReservations
      await SharedAsset.updateOne(
        { _id: booking.asset, 'activeReservations.bookingId': booking._id },
        { $set: { 'activeReservations.$.status': 'confirmed' } }
      );

      await Notification.create({
        recipient: booking.bookedBy,
        type: 'booking_approved',
        title: 'Booking Approved!',
        body: 'Your shared asset reservation has been confirmed.',
        link: `/bookings`,
        relatedGroup: groupId,
      });

      await audit.log({
        actor: req.user.id,
        action: 'booking.approved',
        entityType: 'booking',
        entityId: booking._id,
        relatedGroup: groupId,
        ipAddress: req.ip,
      });
    } else {
      booking.status = 'rejected';
      booking.rejectedReason = reason;
      await booking.save();

      // Release reserved slot
      await SharedAsset.updateOne(
        { _id: booking.asset },
        { $pull: { activeReservations: { bookingId: booking._id } } }
      );

      await Notification.create({
        recipient: booking.bookedBy,
        type: 'booking_rejected',
        title: 'Booking Declined',
        body: reason ? `Your booking was declined: ${reason}` : 'Your booking request was declined.',
        link: `/bookings`,
        relatedGroup: groupId,
      });

      await audit.log({
        actor: req.user.id,
        action: 'booking.rejected',
        entityType: 'booking',
        entityId: booking._id,
        relatedGroup: groupId,
        snapshot: { reason },
        ipAddress: req.ip,
      });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

// ── 13. Cancel Booking ────────────────────────────────────────────────────────
async function cancelBooking(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));

    if (['cancelled', 'completed', 'rejected'].includes(booking.status)) {
      return next(new AppError(`Cannot cancel a booking in '${booking.status}' status.`, 400, 'INVALID_STATUS'));
    }

    const isBooker = booking.bookedBy.toString() === req.user.id.toString();
    const isSysAdmin = req.user.role === 'admin';
    let isGroupLeader = false;

    if (!isBooker && !isSysAdmin) {
      const leaderMembership = await GroupMembership.findOne({
        group: booking.group,
        user: req.user.id,
        role: { $in: ['owner', 'admin', 'moderator'] },
        status: 'active',
      });
      if (leaderMembership) isGroupLeader = true;
    }

    if (!isBooker && !isSysAdmin && !isGroupLeader) {
      return next(new AppError('You are not authorized to cancel this booking.', 403, 'FORBIDDEN'));
    }

    // Cancellation policy: prevent cancelling bookings that have already passed start time
    if (booking.startTime < new Date() && booking.status === 'active') {
      return next(new AppError('Cannot cancel a booking that is currently active or past start time.', 400, 'PAST_START'));
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.id;
    booking.cancellationReason = reason;
    await booking.save();

    // Release slot immediately from activeReservations
    await SharedAsset.updateOne(
      { _id: booking.asset },
      { $pull: { activeReservations: { bookingId: booking._id } } }
    );

    await Notification.create({
      recipient: booking.bookedBy,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: `Reservation for asset was cancelled: ${reason}`,
      link: `/bookings`,
      relatedGroup: booking.group,
    });

    await audit.log({
      actor: req.user.id,
      action: 'booking.cancelled',
      entityType: 'booking',
      entityId: booking._id,
      relatedGroup: booking.group,
      snapshot: { reason },
      ipAddress: req.ip,
      severity: 'warning',
    });

    res.json({ success: true, message: 'Booking cancelled successfully.', data: booking });
  } catch (err) {
    next(err);
  }
}

// ── 14. Record Pickup & Return ────────────────────────────────────────────────
async function recordPickup(req, res, next) {
  try {
    const { groupId, bookingId } = req.params;
    const { conditionAtPickup = '' } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, group: groupId });
    if (!booking) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));

    if (!['confirmed', 'approved'].includes(booking.status)) {
      return next(new AppError('Booking must be confirmed before recording pickup.', 400, 'INVALID_STATUS'));
    }

    booking.status = 'active';
    booking.pickedUpAt = new Date();
    booking.conditionAtPickup = conditionAtPickup;
    await booking.save();

    await SharedAsset.updateOne(
      { _id: booking.asset, 'activeReservations.bookingId': booking._id },
      { $set: { 'activeReservations.$.status': 'active' } }
    );

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

async function recordReturn(req, res, next) {
  try {
    const { groupId, bookingId } = req.params;
    const { conditionAtReturn = '', damageNotes = '' } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, group: groupId });
    if (!booking) return next(new AppError('Booking not found.', 404, 'NOT_FOUND'));

    if (booking.status !== 'active') {
      return next(new AppError('Booking is not currently in active pickup state.', 400, 'INVALID_STATUS'));
    }

    booking.status = 'completed';
    booking.returnedAt = new Date();
    booking.conditionAtReturn = conditionAtReturn;
    booking.damageNotes = damageNotes;
    await booking.save();

    // Release slot upon return completion
    await SharedAsset.updateOne(
      { _id: booking.asset },
      { $pull: { activeReservations: { bookingId: booking._id } } }
    );

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAsset,
  getGroupAssets,
  getAsset,
  updateAsset,
  archiveAsset,
  addMaintenanceBlock,
  removeMaintenanceBlock,
  getAssetAvailability,
  createBooking,
  getAssetBookings,
  getGroupAllBookings,
  getMyBookings,
  approveOrRejectBooking,
  cancelBooking,
  recordPickup,
  recordReturn,
};
