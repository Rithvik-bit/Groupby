'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const bookingCtrl = require('../controllers/bookingController');

const router = express.Router();

router.use(authenticate);

// List authenticated user's bookings across all groups
router.get('/my', bookingCtrl.getMyBookings);

// Cancel user's own booking
router.patch('/:bookingId/cancel', bookingCtrl.cancelBooking);

module.exports = router;
