'use strict';
/**
 * Financial Ledger Routes
 * Mounted at /api/groups/:groupId/financials
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMembership } = require('../middleware/membership');
const financialCtrl = require('../controllers/financialController');

const router = express.Router({ mergeParams: true });

// View ledger & metrics — active group members only
router.get('/', authenticate, requireMembership(), financialCtrl.getFinancialEntries);

// Record financial entry — active group members only
router.post('/', authenticate, requireMembership(), financialCtrl.createFinancialEntry);

// Decide approval on pending entry — group leaders only (checked in controller)
router.patch('/:entryId/approve', authenticate, requireMembership(), financialCtrl.decideApproval);

// Delete financial entry — creator (if pending) or group leaders
router.delete('/:entryId', authenticate, requireMembership(), financialCtrl.deleteFinancialEntry);

module.exports = router;

