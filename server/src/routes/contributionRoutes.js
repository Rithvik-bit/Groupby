'use strict';
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMembership, requireGroupAdmin } = require('../middleware/membership');
const contribCtrl = require('../controllers/contributionController');

const router = express.Router({ mergeParams: true });

// Make contribution — active members only
router.post('/', authenticate, requireMembership(), contribCtrl.contribute);

// Get contributions — members see own; admins see all
router.get('/', authenticate, requireMembership(), contribCtrl.getContributions);

module.exports = router;
