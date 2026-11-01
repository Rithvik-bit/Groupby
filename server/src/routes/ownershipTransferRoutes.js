'use strict';
/**
 * Ownership & Transfer Routes
 * Mounted at /api/groups/:groupId/transfers
 */
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireMembership } = require('../middleware/membership');
const transferCtrl = require('../controllers/ownershipTransferController');

const router = express.Router({ mergeParams: true });

// All routes require authentication & active membership in the group
router.use(authenticate, requireMembership());

// Equity records & summary
router.get('/ownership', transferCtrl.getGroupOwnership);
router.post('/ownership/initialize', transferCtrl.initializeOwnership);

// Transfer proposals & history
router.get('/', transferCtrl.getTransfers);
router.post('/', transferCtrl.proposeTransfer);
router.patch('/:transferId/accept', transferCtrl.acceptTransfer);
router.patch('/:transferId/approve', transferCtrl.approveTransfer);
router.patch('/:transferId/reject', transferCtrl.rejectTransfer);
router.patch('/:transferId/cancel', transferCtrl.cancelTransfer);

module.exports = router;

