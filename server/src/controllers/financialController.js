'use strict';
/**
 * Financial Controller — Group Financial Ledger & Expense Tracking.
 * Handles income, expense records, receipt references, category tracking,
 * and high-value expense member approval workflows in integer paise.
 */
const FinancialEntry = require('../models/FinancialEntry');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const audit = require('../utils/auditLogger');

// Default threshold for requiring leader/member sign-off on expenses (₹1,000 = 100,000 paise)
const DEFAULT_APPROVAL_THRESHOLD_PAISE = 100000;

/**
 * Get all financial ledger entries and a summary for a group.
 */
async function getFinancialEntries(req, res, next) {
  try {
    const { groupId } = req.params;
    const { entryType, category, approvalStatus, page = 1, limit = 50 } = req.query;

    const query = { group: groupId };
    if (entryType) query.entryType = entryType;
    if (category) query.category = category;
    if (approvalStatus) query.approvalStatus = approvalStatus;

    const skip = (Number(page) - 1) * Number(limit);

    const [entries, total] = await Promise.all([
      FinancialEntry.find(query)
        .populate('recordedBy', 'displayName username avatarUrl')
        .populate('approvals.user', 'displayName username avatarUrl')
        .sort({ entryDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FinancialEntry.countDocuments(query),
    ]);

    // Calculate aggregate metrics across all active entries for this group
    const allEntries = await FinancialEntry.find({ group: groupId });

    let totalExpensesPaise = 0;
    let totalRevenuesPaise = 0;
    let totalRefundsPaise = 0;
    let totalDistributionsPaise = 0;
    let pendingApprovalCount = 0;
    let pendingApprovalAmountPaise = 0;

    for (const item of allEntries) {
      if (item.approvalStatus === 'rejected') continue;

      if (item.approvalStatus === 'pending') {
        pendingApprovalCount += 1;
        pendingApprovalAmountPaise += item.amountPaise;
        continue;
      }

      switch (item.entryType) {
        case 'expense':
          totalExpensesPaise += item.amountPaise;
          break;
        case 'revenue':
          totalRevenuesPaise += item.amountPaise;
          break;
        case 'refund':
          totalRefundsPaise += item.amountPaise;
          break;
        case 'distribution':
          totalDistributionsPaise += item.amountPaise;
          break;
        default:
          break;
      }
    }

    const netBalancePaise = (totalRevenuesPaise + totalRefundsPaise) - (totalExpensesPaise + totalDistributionsPaise);

    res.json({
      success: true,
      data: {
        entries,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
        summary: {
          totalExpensesPaise,
          totalRevenuesPaise,
          totalRefundsPaise,
          totalDistributionsPaise,
          netBalancePaise,
          pendingApprovalCount,
          pendingApprovalAmountPaise,
          approvalThresholdPaise: req.group?.expenseApprovalThresholdPaise || DEFAULT_APPROVAL_THRESHOLD_PAISE,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Record a new expense or financial entry.
 */
async function createFinancialEntry(req, res, next) {
  try {
    const { groupId } = req.params;
    const {
      entryType = 'expense',
      amountPaise,
      description,
      category = 'general',
      documentReference = '',
      entryDate,
      ventureId,
    } = req.body;

    if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
      return next(new AppError('amountPaise must be a positive integer in paise.', 400, 'INVALID_AMOUNT'));
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return next(new AppError('description is required.', 400, 'MISSING_DESCRIPTION'));
    }

    const validTypes = ['revenue', 'expense', 'refund', 'distribution'];
    if (!validTypes.includes(entryType)) {
      return next(new AppError(`entryType must be one of: ${validTypes.join(', ')}`, 400, 'INVALID_ENTRY_TYPE'));
    }

    const group = req.group || await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    const membershipRole = req.membership?.role || 'member';
    const isLeader = ['owner', 'admin', 'moderator'].includes(membershipRole) || req.user.role === 'admin';

    const threshold = group.expenseApprovalThresholdPaise || DEFAULT_APPROVAL_THRESHOLD_PAISE;

    let requiresApproval = false;
    let approvalStatus = 'not_required';

    // If an expense exceeds the threshold and user is a regular member, require leader sign-off
    if (entryType === 'expense' && amountPaise >= threshold) {
      if (isLeader) {
        requiresApproval = false;
        approvalStatus = 'approved';
      } else {
        requiresApproval = true;
        approvalStatus = 'pending';
      }
    }

    const entry = await FinancialEntry.create({
      group: groupId,
      venture: ventureId || null,
      recordedBy: req.user.id,
      entryType,
      amountPaise,
      description: description.trim(),
      category: (category || 'general').toLowerCase().trim(),
      documentReference: (documentReference || '').trim(),
      entryDate: entryDate ? new Date(entryDate) : new Date(),
      requiresApproval,
      approvalStatus,
      approvals: isLeader && requiresApproval === false ? [
        {
          user: req.user.id,
          decision: 'approved',
          note: 'Auto-approved by group leader on creation',
          decidedAt: new Date(),
        },
      ] : [],
    });

    await entry.populate('recordedBy', 'displayName username avatarUrl');

    // If expense requires approval, notify group leaders
    if (requiresApproval && approvalStatus === 'pending') {
      const leaders = await GroupMembership.find({
        group: groupId,
        role: { $in: ['owner', 'admin', 'moderator'] },
        status: 'active',
      });

      const notifications = leaders
        .filter((l) => l.user.toString() !== req.user.id)
        .map((l) => ({
          recipient: l.user,
          type: 'expense_approval_needed',
          title: 'Expense Approval Needed',
          body: `@${req.user.username} recorded a high-value expense of ₹${(amountPaise / 100).toLocaleString('en-IN')}: "${description.trim().slice(0, 60)}"`,
          link: `/groups/${groupId}?tab=financials`,
          relatedGroup: groupId,
        }));

      if (notifications.length) {
        await Notification.insertMany(notifications);
      }
    }

    await audit.log({
      actor: req.user.id,
      action: 'financial_entry.created',
      entityType: 'financial_entry',
      entityId: entry._id,
      relatedGroup: groupId,
      snapshot: { entryType, amountPaise, category, approvalStatus },
      severity: 'info',
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Approve or reject a pending expense.
 */
async function decideApproval(req, res, next) {
  try {
    const { groupId, entryId } = req.params;
    const { decision, note = '' } = req.body;

    if (!['approved', 'rejected'].includes(decision)) {
      return next(new AppError('decision must be either "approved" or "rejected".', 400, 'INVALID_DECISION'));
    }

    const membershipRole = req.membership?.role;
    const isLeader = ['owner', 'admin', 'moderator'].includes(membershipRole) || req.user.role === 'admin';

    if (!isLeader) {
      return next(new AppError('Only group admins or moderators can approve or reject expenses.', 403, 'FORBIDDEN'));
    }

    const entry = await FinancialEntry.findOne({ _id: entryId, group: groupId });
    if (!entry) return next(new AppError('Financial entry not found.', 404, 'NOT_FOUND'));

    if (entry.approvalStatus !== 'pending') {
      return next(new AppError(`Entry is already ${entry.approvalStatus}.`, 400, 'ALREADY_DECIDED'));
    }

    entry.approvalStatus = decision;
    entry.approvals.push({
      user: req.user.id,
      decision,
      note: note.trim(),
      decidedAt: new Date(),
    });

    await entry.save();
    await entry.populate('recordedBy', 'displayName username avatarUrl');
    await entry.populate('approvals.user', 'displayName username avatarUrl');

    // Notify the member who recorded it
    if (entry.recordedBy && entry.recordedBy._id.toString() !== req.user.id) {
      await Notification.create({
        recipient: entry.recordedBy._id,
        type: `expense_${decision}`,
        title: `Expense ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
        body: `Your expense of ₹${(entry.amountPaise / 100).toLocaleString('en-IN')} ("${entry.description.slice(0, 50)}") was ${decision} by @${req.user.username}.`,
        link: `/groups/${groupId}?tab=financials`,
        relatedGroup: groupId,
      });
    }

    await audit.log({
      actor: req.user.id,
      action: `financial_entry.${decision}`,
      entityType: 'financial_entry',
      entityId: entry._id,
      relatedGroup: groupId,
      snapshot: { decision, note },
      severity: 'info',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: entry,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a financial entry.
 */
async function deleteFinancialEntry(req, res, next) {
  try {
    const { groupId, entryId } = req.params;

    const entry = await FinancialEntry.findOne({ _id: entryId, group: groupId });
    if (!entry) return next(new AppError('Financial entry not found.', 404, 'NOT_FOUND'));

    const membershipRole = req.membership?.role;
    const isLeader = ['owner', 'admin', 'moderator'].includes(membershipRole) || req.user.role === 'admin';
    const isCreator = entry.recordedBy.toString() === req.user.id;

    if (!isLeader && !(isCreator && entry.approvalStatus === 'pending')) {
      return next(new AppError('You do not have permission to delete this entry.', 403, 'FORBIDDEN'));
    }

    await FinancialEntry.findByIdAndDelete(entryId);

    await audit.log({
      actor: req.user.id,
      action: 'financial_entry.deleted',
      entityType: 'financial_entry',
      entityId: entryId,
      relatedGroup: groupId,
      snapshot: { amountPaise: entry.amountPaise, description: entry.description },
      severity: 'info',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Financial entry removed.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFinancialEntries,
  createFinancialEntry,
  decideApproval,
  deleteFinancialEntry,
};
