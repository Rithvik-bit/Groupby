'use strict';
/**
 * Ownership & Transfer Controller
 * Handles basis point equity records, transfers, acceptances, and leader approvals.
 * 10000 basis points = 100% equity.
 */
const OwnershipRecord = require('../models/OwnershipRecord');
const OwnershipTransfer = require('../models/OwnershipTransfer');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const Product = require('../models/Product');
const SharedAsset = require('../models/SharedAsset');
const Contribution = require('../models/Contribution');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const audit = require('../utils/auditLogger');

/**
 * GET /api/groups/:groupId/transfers/ownership
 * Get all ownership records & distribution summary for the group.
 */
async function getGroupOwnership(req, res, next) {
  try {
    const { groupId } = req.params;

    // Fetch existing records
    let records = await OwnershipRecord.find({
      group: groupId,
      status: { $in: ['agreed', 'finalized', 'proposed'] },
    })
      .populate('user', 'displayName email username avatar')
      .populate('product', 'name pricePaise status')
      .populate('asset', 'name category status')
      .sort({ ownershipBasisPoints: -1 });

    let totalAllocatedBasisPoints = records.reduce((sum, r) => sum + r.ownershipBasisPoints, 0);

    // If no records yet, dynamically compute provisional ownership from successful contributions
    let provisional = false;
    if (records.length === 0) {
      const contributions = await Contribution.find({
        group: groupId,
        status: 'simulated_success',
        type: 'contribution',
      }).populate('user', 'displayName email username avatar');

      const totalContributed = contributions.reduce((sum, c) => sum + c.amountPaise, 0);
      if (totalContributed > 0) {
        provisional = true;
        const userTotals = new Map();
        for (const c of contributions) {
          const uid = c.user?._id?.toString() || c.user?.toString();
          if (!uid) continue;
          if (!userTotals.has(uid)) {
            userTotals.set(uid, { user: c.user, amountPaise: 0 });
          }
          userTotals.get(uid).amountPaise += c.amountPaise;
        }

        records = Array.from(userTotals.values()).map(({ user, amountPaise }) => {
          const bps = Math.round((amountPaise / totalContributed) * 10000);
          return {
            _id: `prov-${user._id || user}`,
            user,
            ownershipBasisPoints: bps,
            contributionAmountPaise: amountPaise,
            status: 'provisional',
            isProvisional: true,
          };
        });
        totalAllocatedBasisPoints = records.reduce((sum, r) => sum + r.ownershipBasisPoints, 0);
      }
    }

    // Find current user's record
    const myRecord = records.find(
      (r) => (r.user?._id?.toString() || r.user?.toString()) === req.user.id
    );

    res.json({
      success: true,
      data: {
        records,
        totalAllocatedBasisPoints,
        provisional,
        myBasisPoints: myRecord ? myRecord.ownershipBasisPoints : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/groups/:groupId/transfers/ownership/initialize
 * Leader action: Initialize or finalize ownership shares from contributions or explicit splits.
 */
async function initializeOwnership(req, res, next) {
  try {
    const { groupId } = req.params;
    const isLeader =
      req.user.role === 'admin' ||
      ['owner', 'admin'].includes(req.membership?.role);

    if (!isLeader) {
      return next(new AppError('Only group administrators can initialize ownership records.', 403, 'INSUFFICIENT_ROLE'));
    }

    const { distributions, productId, assetId, notes } = req.body;

    let itemsToCreate = [];

    if (Array.isArray(distributions) && distributions.length > 0) {
      // Custom distribution provided
      let sumBps = 0;
      for (const d of distributions) {
        if (!d.userId || !Number.isInteger(d.basisPoints) || d.basisPoints < 1) {
          return next(new AppError('Each distribution must have a valid userId and positive basisPoints integer.', 400, 'INVALID_DISTRIBUTION'));
        }
        sumBps += d.basisPoints;
        itemsToCreate.push({
          group: groupId,
          user: d.userId,
          product: productId || null,
          asset: assetId || null,
          ownershipBasisPoints: d.basisPoints,
          status: 'finalized',
          finalizedAt: new Date(),
          finalizedBy: req.user.id,
          notes: d.notes || notes || 'Initial equity allocation',
        });
      }

      if (sumBps > 10000) {
        return next(new AppError(`Total basis points cannot exceed 10000 (got ${sumBps}).`, 400, 'EXCEEDS_MAX_EQUITY'));
      }
    } else {
      // Calculate automatically from contributions
      const contributions = await Contribution.find({
        group: groupId,
        status: 'simulated_success',
        type: 'contribution',
      });

      const totalContributed = contributions.reduce((sum, c) => sum + c.amountPaise, 0);
      if (totalContributed === 0) {
        return next(new AppError('No successful contributions found to derive ownership from.', 400, 'NO_CONTRIBUTIONS'));
      }

      const userTotals = new Map();
      for (const c of contributions) {
        const uid = c.user.toString();
        userTotals.set(uid, (userTotals.get(uid) || 0) + c.amountPaise);
      }

      let runningBps = 0;
      const entries = Array.from(userTotals.entries());
      entries.forEach(([uid, amountPaise], idx) => {
        let bps;
        if (idx === entries.length - 1) {
          // ensure exactly 10000 sum
          bps = 10000 - runningBps;
        } else {
          bps = Math.floor((amountPaise / totalContributed) * 10000);
          runningBps += bps;
        }

        itemsToCreate.push({
          group: groupId,
          user: uid,
          product: productId || null,
          asset: assetId || null,
          ownershipBasisPoints: bps,
          contributionAmountPaise: amountPaise,
          status: 'finalized',
          finalizedAt: new Date(),
          finalizedBy: req.user.id,
          notes: notes || 'Initialized from contribution ledger',
        });
      });
    }

    // Clear old unfinalized/proposed records for this group & item
    await OwnershipRecord.deleteMany({
      group: groupId,
      ...(productId ? { product: productId } : {}),
      ...(assetId ? { asset: assetId } : {}),
    });

    const createdRecords = await OwnershipRecord.insertMany(itemsToCreate);

    await audit.log({
      actor: req.user.id,
      action: 'ownership.initialized',
      entityType: 'ownership_record',
      relatedGroup: groupId,
      snapshot: { count: createdRecords.length },
      severity: 'info',
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Initialized ${createdRecords.length} ownership records.`,
      data: createdRecords,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/groups/:groupId/transfers
 * List all transfer proposals & history for the group.
 */
async function getTransfers(req, res, next) {
  try {
    const { groupId } = req.params;
    const { status } = req.query;

    const filter = { group: groupId };
    if (status) filter.status = status;

    const transfers = await OwnershipTransfer.find(filter)
      .populate('fromUser', 'displayName email username avatar')
      .populate('toUser', 'displayName email username avatar')
      .populate('product', 'name pricePaise')
      .populate('asset', 'name category')
      .populate('approvals.user', 'displayName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: transfers,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/groups/:groupId/transfers
 * Propose an equity transfer to another active member.
 */
async function proposeTransfer(req, res, next) {
  try {
    const { groupId } = req.params;
    const { toUserId, basisPoints, proposedPricePaise = 0, productId, assetId, note } = req.body;

    if (!toUserId) {
      return next(new AppError('Buyer (toUserId) is required.', 400, 'MISSING_BUYER'));
    }

    if (toUserId === req.user.id) {
      return next(new AppError('You cannot transfer shares to yourself.', 400, 'SELF_TRANSFER_PROHIBITED'));
    }

    if (!Number.isInteger(basisPoints) || basisPoints < 1 || basisPoints > 10000) {
      return next(new AppError('basisPoints must be an integer between 1 and 10000.', 400, 'INVALID_BASIS_POINTS'));
    }

    if (!Number.isInteger(proposedPricePaise) || proposedPricePaise < 0) {
      return next(new AppError('proposedPricePaise must be a non-negative integer.', 400, 'INVALID_PRICE'));
    }

    // Verify buyer is an active group member
    const buyerMembership = await GroupMembership.findOne({
      group: groupId,
      user: toUserId,
      status: 'active',
    });
    if (!buyerMembership) {
      return next(new AppError('Recipient must be an active member of this group.', 400, 'BUYER_NOT_ACTIVE_MEMBER'));
    }

    // Verify seller has sufficient basis points
    let sellerRecord = await OwnershipRecord.findOne({
      group: groupId,
      user: req.user.id,
      status: { $in: ['finalized', 'agreed'] },
    });

    // If no explicit finalized record exists, check if provisional shares exist from contributions
    if (!sellerRecord) {
      const contributions = await Contribution.find({
        group: groupId,
        status: 'simulated_success',
        type: 'contribution',
      });
      const totalContributed = contributions.reduce((s, c) => s + c.amountPaise, 0);
      const userContributed = contributions
        .filter((c) => c.user.toString() === req.user.id)
        .reduce((s, c) => s + c.amountPaise, 0);

      if (totalContributed > 0 && userContributed > 0) {
        const bps = Math.floor((userContributed / totalContributed) * 10000);
        // Auto-finalize seller record so it can be cleanly traded
        sellerRecord = await OwnershipRecord.create({
          group: groupId,
          user: req.user.id,
          product: productId || null,
          asset: assetId || null,
          ownershipBasisPoints: bps,
          contributionAmountPaise: userContributed,
          status: 'finalized',
          finalizedAt: new Date(),
        });
      }
    }

    if (!sellerRecord || sellerRecord.ownershipBasisPoints < basisPoints) {
      const available = sellerRecord ? sellerRecord.ownershipBasisPoints : 0;
      return next(new AppError(`Insufficient equity share. You have ${available} basis points (${(available / 100).toFixed(2)}%), but tried to transfer ${basisPoints}.`, 400, 'INSUFFICIENT_EQUITY'));
    }

    // Check active pending transfers to prevent double-spending equity
    const pendingTransfers = await OwnershipTransfer.find({
      group: groupId,
      fromUser: req.user.id,
      status: { $in: ['proposed', 'awaiting_buyer', 'awaiting_approval'] },
    });
    const lockedBps = pendingTransfers.reduce((s, t) => s + t.basisPointsToTransfer, 0);

    if (sellerRecord.ownershipBasisPoints - lockedBps < basisPoints) {
      return next(new AppError(`You have ${lockedBps} basis points already locked in pending transfers. Available: ${sellerRecord.ownershipBasisPoints - lockedBps} bps.`, 400, 'EQUITY_LOCKED'));
    }

    const transfer = await OwnershipTransfer.create({
      group: groupId,
      product: productId || sellerRecord.product || null,
      asset: assetId || sellerRecord.asset || null,
      fromUser: req.user.id,
      toUser: toUserId,
      basisPointsToTransfer: basisPoints,
      proposedPricePaise,
      status: 'awaiting_buyer',
      sourceOwnershipRecord: sellerRecord._id,
      auditNote: note || '',
    });

    // Notify buyer
    await Notification.create({
      recipient: toUserId,
      type: 'ownership_transfer_request',
      title: 'Ownership transfer proposal',
      body: `${req.user.displayName || 'A member'} offered to transfer ${(basisPoints / 100).toFixed(2)}% share to you for ₹${(proposedPricePaise / 100).toFixed(2)}.`,
      link: `/groups/${groupId}?tab=transfers`,
      relatedGroup: groupId,
      relatedUser: req.user.id,
    });

    await audit.log({
      actor: req.user.id,
      action: 'ownership.transfer_proposed',
      entityType: 'ownership_transfer',
      entityId: transfer._id,
      relatedGroup: groupId,
      snapshot: { basisPoints, proposedPricePaise, toUser: toUserId },
      severity: 'info',
      ipAddress: req.ip,
    });

    const populated = await OwnershipTransfer.findById(transfer._id)
      .populate('fromUser', 'displayName email username avatar')
      .populate('toUser', 'displayName email username avatar');

    res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/groups/:groupId/transfers/:transferId/accept
 * Buyer accepts proposed equity transfer. Moves status to 'awaiting_approval'.
 */
async function acceptTransfer(req, res, next) {
  try {
    const { groupId, transferId } = req.params;
    const { note } = req.body;

    const transfer = await OwnershipTransfer.findOne({ _id: transferId, group: groupId });
    if (!transfer) {
      return next(new AppError('Transfer request not found.', 404, 'NOT_FOUND'));
    }

    if (transfer.toUser.toString() !== req.user.id) {
      return next(new AppError('Only the designated recipient can accept this transfer.', 403, 'FORBIDDEN'));
    }

    if (transfer.status !== 'awaiting_buyer' && transfer.status !== 'proposed') {
      return next(new AppError(`Cannot accept transfer in status '${transfer.status}'.`, 400, 'INVALID_STATUS'));
    }

    transfer.status = 'awaiting_approval';
    if (note) transfer.auditNote = (transfer.auditNote ? transfer.auditNote + ' | ' : '') + `Buyer note: ${note}`;
    await transfer.save();

    // Notify group leaders that transfer requires sign-off
    const admins = await GroupMembership.find({
      group: groupId,
      role: { $in: ['admin', 'owner', 'moderator'] },
      status: 'active',
    });

    const notifs = admins.map((m) => ({
      recipient: m.user,
      type: 'ownership_transfer_request',
      title: 'Ownership transfer needs approval',
      body: `Transfer of ${(transfer.basisPointsToTransfer / 100).toFixed(2)}% share has been agreed between members and awaits your sign-off.`,
      link: `/groups/${groupId}?tab=transfers`,
      relatedGroup: groupId,
    }));
    if (notifs.length) await Notification.insertMany(notifs);

    await audit.log({
      actor: req.user.id,
      action: 'ownership.transfer_accepted',
      entityType: 'ownership_transfer',
      entityId: transfer._id,
      relatedGroup: groupId,
      severity: 'info',
      ipAddress: req.ip,
    });

    const populated = await OwnershipTransfer.findById(transfer._id)
      .populate('fromUser', 'displayName email username avatar')
      .populate('toUser', 'displayName email username avatar');

    res.json({
      success: true,
      message: 'Transfer accepted by buyer. Awaiting group administrator approval.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/groups/:groupId/transfers/:transferId/approve
 * Leader action: Sign-off and finalize ownership transfer, rebalancing basis points.
 */
async function approveTransfer(req, res, next) {
  try {
    const { groupId, transferId } = req.params;
    const { note } = req.body;

    const isLeader =
      req.user.role === 'admin' ||
      ['owner', 'admin'].includes(req.membership?.role);

    if (!isLeader) {
      return next(new AppError('Only group administrators can approve ownership transfers.', 403, 'INSUFFICIENT_ROLE'));
    }

    const transfer = await OwnershipTransfer.findOne({ _id: transferId, group: groupId });
    if (!transfer) {
      return next(new AppError('Transfer request not found.', 404, 'NOT_FOUND'));
    }

    if (transfer.status !== 'awaiting_approval' && transfer.status !== 'awaiting_buyer') {
      return next(new AppError(`Cannot approve transfer in status '${transfer.status}'.`, 400, 'INVALID_STATUS'));
    }

    // Rebalance OwnershipRecords
    let sellerRecord = await OwnershipRecord.findOne({
      group: groupId,
      user: transfer.fromUser,
      status: { $in: ['finalized', 'agreed'] },
    });

    if (!sellerRecord || sellerRecord.ownershipBasisPoints < transfer.basisPointsToTransfer) {
      return next(new AppError('Seller no longer holds sufficient basis points to complete this transfer.', 400, 'INSUFFICIENT_EQUITY'));
    }

    // Deduct from seller
    sellerRecord.ownershipBasisPoints -= transfer.basisPointsToTransfer;
    if (sellerRecord.ownershipBasisPoints === 0) {
      sellerRecord.status = 'transferred';
    }
    await sellerRecord.save();

    // Credit to buyer
    let buyerRecord = await OwnershipRecord.findOne({
      group: groupId,
      user: transfer.toUser,
      status: { $in: ['finalized', 'agreed'] },
    });

    if (buyerRecord) {
      buyerRecord.ownershipBasisPoints += transfer.basisPointsToTransfer;
      await buyerRecord.save();
    } else {
      buyerRecord = await OwnershipRecord.create({
        group: groupId,
        user: transfer.toUser,
        product: transfer.product || null,
        asset: transfer.asset || null,
        ownershipBasisPoints: transfer.basisPointsToTransfer,
        status: 'finalized',
        finalizedAt: new Date(),
        finalizedBy: req.user.id,
        notes: `Received via transfer from ${transfer.fromUser}`,
      });
    }

    // Mark transfer completed
    transfer.status = 'completed';
    transfer.completedAt = new Date();
    transfer.approvals.push({
      user: req.user.id,
      decision: 'approved',
      note: note || 'Approved by group administrator',
      decidedAt: new Date(),
    });
    await transfer.save();

    // Notify seller and buyer
    const pct = (transfer.basisPointsToTransfer / 100).toFixed(2);
    await Notification.insertMany([
      {
        recipient: transfer.fromUser,
        type: 'ownership_transfer_complete',
        title: 'Transfer approved & finalized',
        body: `Your transfer of ${pct}% share to member has been approved and completed.`,
        link: `/groups/${groupId}?tab=transfers`,
        relatedGroup: groupId,
      },
      {
        recipient: transfer.toUser,
        type: 'ownership_transfer_complete',
        title: 'Transfer approved & finalized',
        body: `You are now the recorded owner of an additional ${pct}% share in this group!`,
        link: `/groups/${groupId}?tab=transfers`,
        relatedGroup: groupId,
      },
    ]);

    await audit.log({
      actor: req.user.id,
      action: 'ownership.transfer_completed',
      entityType: 'ownership_transfer',
      entityId: transfer._id,
      relatedGroup: groupId,
      snapshot: {
        fromUser: transfer.fromUser,
        toUser: transfer.toUser,
        basisPoints: transfer.basisPointsToTransfer,
      },
      severity: 'info',
      ipAddress: req.ip,
    });

    const populated = await OwnershipTransfer.findById(transfer._id)
      .populate('fromUser', 'displayName email username avatar')
      .populate('toUser', 'displayName email username avatar')
      .populate('approvals.user', 'displayName');

    res.json({
      success: true,
      message: 'Ownership transfer approved and equity records updated.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/groups/:groupId/transfers/:transferId/reject
 * Reject a transfer (by buyer or group admin).
 */
async function rejectTransfer(req, res, next) {
  try {
    const { groupId, transferId } = req.params;
    const { note } = req.body;

    const transfer = await OwnershipTransfer.findOne({ _id: transferId, group: groupId });
    if (!transfer) {
      return next(new AppError('Transfer request not found.', 404, 'NOT_FOUND'));
    }

    const isBuyer = transfer.toUser.toString() === req.user.id;
    const isLeader =
      req.user.role === 'admin' ||
      ['owner', 'admin'].includes(req.membership?.role);

    if (!isBuyer && !isLeader) {
      return next(new AppError('Only the recipient or a group administrator can reject this transfer.', 403, 'FORBIDDEN'));
    }

    if (['completed', 'cancelled', 'rejected'].includes(transfer.status)) {
      return next(new AppError(`Cannot reject transfer in status '${transfer.status}'.`, 400, 'INVALID_STATUS'));
    }

    transfer.status = 'rejected';
    transfer.approvals.push({
      user: req.user.id,
      decision: 'rejected',
      note: note || (isBuyer ? 'Declined by recipient' : 'Rejected by administrator'),
      decidedAt: new Date(),
    });
    await transfer.save();

    // Notify seller
    await Notification.create({
      recipient: transfer.fromUser,
      type: 'ownership_transfer_rejected',
      title: 'Ownership transfer rejected',
      body: `Your proposal to transfer ${(transfer.basisPointsToTransfer / 100).toFixed(2)}% share was rejected. ${note ? `Reason: ${note}` : ''}`,
      link: `/groups/${groupId}?tab=transfers`,
      relatedGroup: groupId,
    });

    await audit.log({
      actor: req.user.id,
      action: 'ownership.transfer_rejected',
      entityType: 'ownership_transfer',
      entityId: transfer._id,
      relatedGroup: groupId,
      severity: 'info',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Transfer rejected.',
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/groups/:groupId/transfers/:transferId/cancel
 * Cancel a transfer proposal (by seller before finalization).
 */
async function cancelTransfer(req, res, next) {
  try {
    const { groupId, transferId } = req.params;

    const transfer = await OwnershipTransfer.findOne({ _id: transferId, group: groupId });
    if (!transfer) {
      return next(new AppError('Transfer request not found.', 404, 'NOT_FOUND'));
    }

    const isSeller = transfer.fromUser.toString() === req.user.id;
    const isLeader =
      req.user.role === 'admin' ||
      ['owner', 'admin'].includes(req.membership?.role);

    if (!isSeller && !isLeader) {
      return next(new AppError('Only the seller or a group administrator can cancel this transfer.', 403, 'FORBIDDEN'));
    }

    if (['completed', 'cancelled', 'rejected'].includes(transfer.status)) {
      return next(new AppError(`Cannot cancel transfer in status '${transfer.status}'.`, 400, 'INVALID_STATUS'));
    }

    transfer.status = 'cancelled';
    await transfer.save();

    await audit.log({
      actor: req.user.id,
      action: 'ownership.transfer_cancelled',
      entityType: 'ownership_transfer',
      entityId: transfer._id,
      relatedGroup: groupId,
      severity: 'info',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Transfer proposal cancelled.',
      data: transfer,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getGroupOwnership,
  initializeOwnership,
  getTransfers,
  proposeTransfer,
  acceptTransfer,
  approveTransfer,
  rejectTransfer,
  cancelTransfer,
};
