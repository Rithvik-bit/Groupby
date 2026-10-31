'use strict';
/**
 * Contribution controller — Mode A simulated contributions.
 * Idempotency keys prevent duplicate processing.
 * Amounts validated server-side; never trust client for amounts.
 */
const Contribution = require('../models/Contribution');
const Group = require('../models/Group');
const Product = require('../models/Product');
const GroupMembership = require('../models/GroupMembership');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const audit = require('../utils/auditLogger');
const { v4: uuidv4 } = require('uuid');

async function contribute(req, res, next) {
  try {
    const { groupId } = req.params;
    const { amountPaise, productId, idempotencyKey, note } = req.body;

    if (!Number.isInteger(amountPaise) || amountPaise < 1) {
      return next(new AppError('amountPaise must be a positive integer.', 400, 'INVALID_AMOUNT'));
    }

    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    // Check contribution limits
    if (group.minContributionPaise && amountPaise < group.minContributionPaise) {
      return next(new AppError(`Minimum contribution is ${group.minContributionPaise} paise.`, 400, 'BELOW_MIN'));
    }
    if (group.maxContributionPaise && amountPaise > group.maxContributionPaise) {
      return next(new AppError(`Maximum contribution is ${group.maxContributionPaise} paise.`, 400, 'ABOVE_MAX'));
    }

    // Idempotency check
    const ikey = idempotencyKey || uuidv4();
    const existing = await Contribution.findOne({ idempotencyKey: ikey });
    if (existing) return res.json({ success: true, data: existing, idempotent: true });

    const contribution = await Contribution.create({
      group: groupId,
      user: req.user.id,
      product: productId || null,
      amountPaise,
      type: 'contribution',
      status: 'simulated_success',
      idempotencyKey: ikey,
      paymentProvider: 'simulated',
      paymentReference: `SIM-${uuidv4().slice(0, 8).toUpperCase()}`,
      note: note || '',
      processedAt: new Date(),
      isSimulated: true,
    });

    // Update group funding progress
    await Group.findByIdAndUpdate(groupId, { $inc: { currentAmountPaise: amountPaise } });

    // Notify group admins
    const admins = await GroupMembership.find({ group: groupId, role: { $in: ['admin', 'moderator'] }, status: 'active' });
    const notifs = admins.map((m) => ({
      recipient: m.user,
      type: 'contribution_received',
      title: '[SIMULATED] Contribution received',
      body: `A simulated contribution of ₹${(amountPaise / 100).toFixed(2)} was recorded.`,
      link: `/groups/${groupId}`,
      relatedGroup: groupId,
    }));
    if (notifs.length) await Notification.insertMany(notifs);

    await audit.log({
      actor: req.user.id, action: 'contribution.created',
      entityType: 'contribution', entityId: contribution._id,
      relatedGroup: groupId,
      snapshot: { amountPaise, isSimulated: true },
      severity: 'info', ipAddress: req.ip,
    });

    // Check if fully funded
    const refreshed = await Group.findById(groupId);
    if (refreshed.targetAmountPaise > 0 && refreshed.currentAmountPaise >= refreshed.targetAmountPaise) {
      await Group.findByIdAndUpdate(groupId, { status: 'funded' });
      await audit.log({
        action: 'group.funded', entityType: 'group', entityId: groupId,
        relatedGroup: groupId, severity: 'info',
      });
    }

    res.status(201).json({ success: true, data: contribution });
  } catch (err) {
    next(err);
  }
}

async function getContributions(req, res, next) {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Only show current user's own contributions unless group admin
    const membership = req.membership;
    const filter = { group: groupId };
    if (!['admin', 'moderator'].includes(membership?.role) && req.user.role !== 'admin') {
      filter.user = req.user.id;
    }

    const [contributions, total] = await Promise.all([
      Contribution.find(filter)
        .populate('user', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Contribution.countDocuments(filter),
    ]);

    res.json({ success: true, data: contributions, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    next(err);
  }
}

module.exports = { contribute, getContributions };
