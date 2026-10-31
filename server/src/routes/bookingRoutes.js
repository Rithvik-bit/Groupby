'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMembership, requireGroupAdmin } = require('../middleware/membership');
const bookingCtrl = require('../controllers/bookingController');

const router = express.Router({ mergeParams: true });

// ── Shared Asset CRUD (Scoped to group) ──────────────────────────────────────
router.post('/', authenticate, requireGroupAdmin, bookingCtrl.createAsset);
router.get('/', authenticate, requireMembership(), bookingCtrl.getGroupAssets);
router.get('/:assetId', authenticate, requireMembership(), bookingCtrl.getAsset);
router.patch('/:assetId', authenticate, requireGroupAdmin, bookingCtrl.updateAsset);
router.post('/:assetId/archive', authenticate, requireGroupAdmin, bookingCtrl.archiveAsset);

// ── Maintenance Blocks ────────────────────────────────────────────────────────
router.post('/:assetId/maintenance', authenticate, requireGroupAdmin, bookingCtrl.addMaintenanceBlock);
router.delete('/:assetId/maintenance/:blockId', authenticate, requireGroupAdmin, bookingCtrl.removeMaintenanceBlock);

// ── Availability Calendar ─────────────────────────────────────────────────────
router.get('/:assetId/availability', authenticate, requireMembership(), bookingCtrl.getAssetAvailability);

// ── Bookings Scoped to Asset ──────────────────────────────────────────────────
router.post('/:assetId/bookings', authenticate, requireMembership(), bookingCtrl.createBooking);
router.get('/:assetId/bookings', authenticate, requireMembership(), bookingCtrl.getAssetBookings);

// ── Group Manager Booking Actions ─────────────────────────────────────────────
router.get('/bookings/all', authenticate, requireGroupAdmin, bookingCtrl.getGroupAllBookings);
router.patch('/bookings/:bookingId/approval', authenticate, requireGroupAdmin, bookingCtrl.approveOrRejectBooking);
router.patch('/bookings/:bookingId/cancel', authenticate, requireMembership(), bookingCtrl.cancelBooking);
router.patch('/bookings/:bookingId/pickup', authenticate, requireGroupAdmin, bookingCtrl.recordPickup);
router.patch('/bookings/:bookingId/return', authenticate, requireGroupAdmin, bookingCtrl.recordReturn);

module.exports = router;
