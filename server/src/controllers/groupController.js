'use strict';
/**
 * Group controller — CRUD, discovery, membership, roles, invitations and lifecycle.
 * Enforces strict visibility rules: private groups and their memberships are never leaked to non-members.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const User = require('../models/User');
const Notification = require('../models/Notification');
const BusinessVenture = require('../models/BusinessVenture');
const AppError = require('../utils/AppError');
const audit = require('../utils/auditLogger');

// Helper: URL-safe slug generator
function makeSlug(title) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    Date.now()
  );
}

// SHA-256 token hashing
function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// Permitted Lifecycle Transitions State Machine
const PERMITTED_TRANSITIONS = {
  draft: ['open', 'cancelled'],
  open: ['funding', 'active', 'cancelled'],
  funding: ['funded', 'cancelled'],
  funded: ['purchasing', 'active', 'cancelled'],
  purchasing: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

// ── 1. Create Group ───────────────────────────────────────────────────────────
async function createGroup(req, res, next) {
  try {
    const {
      title,
      description,
      groupType,
      category,
      visibility = 'public',
      minMembers = 2,
      maxMembers = 20,
      targetAmountPaise = 0,
      minContributionPaise = 0,
      maxContributionPaise = 0,
      fundingDeadline,
      rules = '',
      cancellationRules = '',
      tags = [],
      city = '',
      state = '',
      country = '',
    } = req.body;

    if (!title || !description || !groupType || !category) {
      return next(new AppError('Title, description, groupType, and category are required.', 400, 'VALIDATION_ERROR'));
    }

    if (maxMembers < 2) {
      return next(new AppError('Maximum members must be at least 2.', 400, 'INVALID_MAX_MEMBERS'));
    }

    if (minMembers < 2 || minMembers > maxMembers) {
      return next(new AppError('minMembers must be >= 2 and <= maxMembers.', 400, 'INVALID_MIN_MEMBERS'));
    }

    const slug = makeSlug(title);
    const inviteCode = visibility !== 'public' ? nanoid(10) : undefined;

    const group = await Group.create({
      title,
      description,
      groupType,
      category,
      visibility,
      createdBy: req.user.id,
      slug,
      inviteCode,
      minMembers,
      maxMembers,
      targetAmountPaise: Math.max(0, parseInt(targetAmountPaise, 10) || 0),
      minContributionPaise: Math.max(0, parseInt(minContributionPaise, 10) || 0),
      maxContributionPaise: Math.max(0, parseInt(maxContributionPaise, 10) || 0),
      fundingDeadline: fundingDeadline ? new Date(fundingDeadline) : null,
      rules,
      cancellationRules,
      tags: Array.isArray(tags) ? tags : [],
      city,
      state,
      country,
      memberCount: 1,
    });

    // Creator is assigned the owner role
    await GroupMembership.create({
      group: group._id,
      user: req.user.id,
      role: 'owner',
      status: 'active',
      joinedAt: new Date(),
    });

    await audit.log({
      actor: req.user.id,
      action: 'group.created',
      entityType: 'group',
      entityId: group._id,
      relatedGroup: group._id,
      snapshot: { title, groupType, visibility, targetAmountPaise: group.targetAmountPaise },
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

// ── 2. Discover Groups ────────────────────────────────────────────────────────
async function discoverGroups(req, res, next) {
  try {
    const {
      category,
      groupType,
      status,
      city,
      state,
      country,
      search,
      minTargetPaise,
      maxTargetPaise,
      hasCapacity,
      matchInterests,
      page = 1,
      limit = 20,
    } = req.query;

    // Discovery STRICTLY returns public groups only!
    const filter = { visibility: 'public' };

    if (category) filter.category = category;
    if (groupType) filter.groupType = groupType;
    if (status) filter.status = status;
    if (city) filter.city = new RegExp(city, 'i');
    if (state) filter.state = new RegExp(state, 'i');
    if (country) filter.country = new RegExp(country, 'i');

    if (minTargetPaise !== undefined || maxTargetPaise !== undefined) {
      filter.targetAmountPaise = {};
      if (minTargetPaise !== undefined) filter.targetAmountPaise.$gte = Number(minTargetPaise);
      if (maxTargetPaise !== undefined) filter.targetAmountPaise.$lte = Number(maxTargetPaise);
    }

    if (hasCapacity === 'true' || hasCapacity === true) {
      filter.$expr = { $lt: ['$memberCount', '$maxMembers'] };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
    }

    // Interest matching based on authenticated user's preferences
    if ((matchInterests === 'true' || matchInterests === true) && req.user) {
      const user = await User.findById(req.user.id).select('interests');
      if (user && user.interests && user.interests.length > 0) {
        filter.$or = [
          ...(filter.$or || []),
          { category: { $in: user.interests } },
          { tags: { $in: user.interests } },
        ];
      }
    }

    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * safeLimit;

    const [groups, total] = await Promise.all([
      Group.find(filter)
        .select('-inviteCode') // Never leak invite codes to public discovery
        .populate('createdBy', 'username displayName avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      Group.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: groups,
      pagination: {
        page: Math.max(1, Number(page) || 1),
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── 3. Get Group Detail ───────────────────────────────────────────────────────
async function getGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return next(new AppError('Invalid group ID.', 400, 'INVALID_ID'));
    }

    const group = await Group.findById(groupId).populate('createdBy', 'username displayName avatarUrl');
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    let viewerMembership = null;
    if (req.user) {
      viewerMembership = await GroupMembership.findOne({
        group: groupId,
        user: req.user.id,
        status: 'active',
      });
    }

    // Visibility enforcement:
    // If private: only active members or system admins can view. Non-members receive 404 to avoid disclosing existence.
    if (group.visibility === 'private') {
      const isSystemAdmin = req.user && req.user.role === 'admin';
      if (!viewerMembership && !isSystemAdmin) {
        return next(new AppError('Group not found.', 404, 'NOT_FOUND'));
      }
    }

    const groupData = group.toJSON();

    // Invite code privacy: only expose to group owner, moderator, or system admin
    const canSeeInvite =
      (req.user && req.user.role === 'admin') ||
      (viewerMembership && ['owner', 'admin', 'moderator'].includes(viewerMembership.role));

    if (canSeeInvite) {
      // keep inviteCode
    } else {
      delete groupData.inviteCode;
    }

    if (group.groupType === 'business_venture') {
      groupData.venture = await BusinessVenture.findOne({ group: groupId });
    }

    // Attach current viewer role for client-side rendering convenience
    if (viewerMembership) {
      groupData.viewerRole = viewerMembership.role;
      groupData.isMember = true;
    } else {
      groupData.isMember = false;
    }

    res.json({ success: true, data: groupData });
  } catch (err) {
    next(err);
  }
}

// ── 4. Update Group & Lifecycle Transitions ───────────────────────────────────
async function updateGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    const allowed = [
      'title',
      'description',
      'category',
      'visibility',
      'minMembers',
      'maxMembers',
      'targetAmountPaise',
      'minContributionPaise',
      'maxContributionPaise',
      'fundingDeadline',
      'rules',
      'cancellationRules',
      'tags',
      'city',
      'state',
      'country',
      'status',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Lifecycle transition validation
    if (updates.status && updates.status !== group.status) {
      const allowedNext = PERMITTED_TRANSITIONS[group.status] || [];
      if (!allowedNext.includes(updates.status)) {
        return next(
          new AppError(
            `Illegal lifecycle transition from '${group.status}' to '${updates.status}'. Permitted: [${allowedNext.join(', ')}]`,
            400,
            'ILLEGAL_STATUS_TRANSITION'
          )
        );
      }
    }

    if (updates.maxMembers !== undefined && updates.maxMembers < group.memberCount) {
      return next(
        new AppError(
          `maxMembers cannot be set below current member count (${group.memberCount}).`,
          400,
          'INVALID_MAX_MEMBERS'
        )
      );
    }

    Object.assign(group, updates);
    await group.save();

    await audit.log({
      actor: req.user.id,
      action: 'group.updated',
      entityType: 'group',
      entityId: group._id,
      relatedGroup: group._id,
      snapshot: updates,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

// ── 5. Cancel Group ───────────────────────────────────────────────────────────
async function cancelGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const { reason = 'Cancelled by owner' } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    if (group.status === 'cancelled') {
      return next(new AppError('Group is already cancelled.', 400, 'ALREADY_CANCELLED'));
    }
    if (group.status === 'completed') {
      return next(new AppError('Completed groups cannot be cancelled.', 400, 'GROUP_COMPLETED'));
    }

    group.status = 'cancelled';
    await group.save();

    // Notify all active members
    const activeMembers = await GroupMembership.find({ group: groupId, status: 'active' });
    const notifications = activeMembers.map((m) => ({
      recipient: m.user,
      type: 'group_cancelled',
      title: `Group '${group.title}' was cancelled`,
      body: reason,
      link: `/groups/${groupId}`,
      relatedGroup: groupId,
    }));
    if (notifications.length) await Notification.insertMany(notifications);

    await audit.log({
      actor: req.user.id,
      action: 'group.cancelled',
      entityType: 'group',
      entityId: group._id,
      relatedGroup: group._id,
      snapshot: { reason },
      ipAddress: req.ip,
      severity: 'warning',
    });

    res.json({ success: true, message: 'Group cancelled successfully.', data: group });
  } catch (err) {
    next(err);
  }
}

// ── 6. Get Group Members (Safe / Sanitized) ───────────────────────────────────
async function getGroupMembers(req, res, next) {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    // If private group, verify caller is an active member or admin
    if (group.visibility === 'private') {
      const isSystemAdmin = req.user && req.user.role === 'admin';
      const isMember = await GroupMembership.findOne({ group: groupId, user: req.user.id, status: 'active' });
      if (!isMember && !isSystemAdmin) {
        return next(new AppError('Group not found.', 404, 'NOT_FOUND'));
      }
    }

    const members = await GroupMembership.find({ group: groupId, status: 'active' })
      .populate('user', 'username displayName avatarUrl verificationStatus')
      .sort({ joinedAt: 1 });

    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

// ── 7. Join Request ───────────────────────────────────────────────────────────
async function requestJoin(req, res, next) {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    // Private groups cannot be requested directly (must be invited)
    if (group.visibility === 'private') {
      return next(new AppError('Group not found.', 404, 'NOT_FOUND'));
    }

    if (['cancelled', 'completed'].includes(group.status)) {
      return next(new AppError(`Cannot join a ${group.status} group.`, 400, 'GROUP_INACTIVE'));
    }

    const existing = await GroupMembership.findOne({ group: groupId, user: req.user.id });
    if (existing && existing.status === 'active') {
      return next(new AppError('Already an active member.', 409, 'ALREADY_MEMBER'));
    }
    if (existing && existing.status === 'pending') {
      return next(new AppError('Join request is already pending.', 409, 'REQUEST_PENDING'));
    }

    if (group.memberCount >= group.maxMembers) {
      return next(new AppError('Group has reached maximum membership capacity.', 400, 'GROUP_FULL'));
    }

    let membership;
    if (existing) {
      existing.status = 'pending';
      existing.role = 'member';
      existing.leftAt = undefined;
      existing.removedAt = undefined;
      membership = await existing.save();
    } else {
      membership = await GroupMembership.create({
        group: groupId,
        user: req.user.id,
        role: 'member',
        status: 'pending',
      });
    }

    // Notify group owner & moderators
    const leaders = await GroupMembership.find({
      group: groupId,
      role: { $in: ['owner', 'admin', 'moderator'] },
      status: 'active',
    });

    const notifications = leaders.map((leader) => ({
      recipient: leader.user,
      type: 'join_request',
      title: 'New join request',
      body: `${req.user.username} requested to join '${group.title}'.`,
      link: `/groups/${groupId}`,
      relatedGroup: groupId,
      relatedUser: req.user.id,
    }));
    if (notifications.length) await Notification.insertMany(notifications);

    res.status(201).json({ success: true, message: 'Join request submitted.', data: membership });
  } catch (err) {
    next(err);
  }
}

// ── 8. List Pending Join Requests ─────────────────────────────────────────────
async function getJoinRequests(req, res, next) {
  try {
    const { groupId } = req.params;
    const requests = await GroupMembership.find({ group: groupId, status: 'pending' })
      .populate('user', 'username displayName avatarUrl email verificationStatus')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (err) {
    next(err);
  }
}

// ── 9. Handle Join Request (Approve / Reject) ──────────────────────────────────
async function handleJoinRequest(req, res, next) {
  try {
    const { groupId, memberId } = req.params;
    const { decision } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(decision)) {
      return next(new AppError('Decision must be "approve" or "reject".', 400, 'INVALID_DECISION'));
    }

    const membership = await GroupMembership.findOne({
      group: groupId,
      _id: memberId,
      status: 'pending',
    });
    if (!membership) return next(new AppError('Pending join request not found.', 404, 'NOT_FOUND'));

    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    if (decision === 'approve') {
      if (group.memberCount >= group.maxMembers) {
        return next(new AppError('Group has reached maximum capacity.', 400, 'GROUP_FULL'));
      }

      membership.role = 'member';
      membership.status = 'active';
      membership.joinedAt = new Date();
      await membership.save();

      await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: 1 } });

      await Notification.create({
        recipient: membership.user,
        type: 'join_approved',
        title: 'Join request approved!',
        body: `Your request to join '${group.title}' has been approved.`,
        link: `/groups/${groupId}`,
        relatedGroup: groupId,
      });

      await audit.log({
        actor: req.user.id,
        action: 'membership.approved',
        entityType: 'group_membership',
        entityId: membership._id,
        relatedGroup: groupId,
        snapshot: { user: membership.user, role: 'member' },
        ipAddress: req.ip,
      });
    } else {
      membership.status = 'rejected';
      await membership.save();

      await Notification.create({
        recipient: membership.user,
        type: 'join_rejected',
        title: 'Join request declined',
        body: `Your request to join '${group.title}' was declined.`,
        link: `/groups`,
        relatedGroup: groupId,
      });

      await audit.log({
        actor: req.user.id,
        action: 'membership.rejected',
        entityType: 'group_membership',
        entityId: membership._id,
        relatedGroup: groupId,
        snapshot: { user: membership.user },
        ipAddress: req.ip,
      });
    }

    res.json({ success: true, data: membership });
  } catch (err) {
    next(err);
  }
}

// ── 10. Send Group Invitation to a Specific User ──────────────────────────────
async function createInvitation(req, res, next) {
  try {
    const { groupId } = req.params;
    const { identifier } = req.body; // username, email, or ObjectId

    if (!identifier) {
      return next(new AppError('User identifier (username, email, or ID) is required.', 400, 'MISSING_IDENTIFIER'));
    }

    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    if (group.memberCount >= group.maxMembers) {
      return next(new AppError('Group is full.', 400, 'GROUP_FULL'));
    }

    // Locate target user
    const query = [
      { email: identifier.trim().toLowerCase() },
      { username: identifier.trim().toLowerCase() },
    ];
    if (mongoose.Types.ObjectId.isValid(identifier.trim())) {
      query.push({ _id: identifier.trim() });
    }

    const targetUser = await User.findOne({ $or: query });
    if (!targetUser) return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));

    if (targetUser._id.toString() === req.user.id.toString()) {
      return next(new AppError('Cannot invite yourself.', 400, 'CANNOT_INVITE_SELF'));
    }

    const existing = await GroupMembership.findOne({ group: groupId, user: targetUser._id });
    if (existing && existing.status === 'active') {
      return next(new AppError('User is already an active member.', 409, 'ALREADY_MEMBER'));
    }

    if (existing && existing.status === 'invited' && existing.inviteExpiresAt > new Date()) {
      return next(new AppError('User already has a pending invitation.', 409, 'ALREADY_INVITED'));
    }

    // Generate secure unpredictable invite token
    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7-day expiry

    let membership;
    if (existing) {
      existing.status = 'invited';
      existing.role = 'member';
      existing.invitedBy = req.user.id;
      existing.inviteTokenHash = tokenHash;
      existing.inviteExpiresAt = expiresAt;
      membership = await existing.save();
    } else {
      membership = await GroupMembership.create({
        group: groupId,
        user: targetUser._id,
        role: 'member',
        status: 'invited',
        invitedBy: req.user.id,
        inviteTokenHash: tokenHash,
        inviteExpiresAt: expiresAt,
      });
    }

    await Notification.create({
      recipient: targetUser._id,
      type: 'group_invite',
      title: 'Group Invitation',
      body: `You were invited to join '${group.title}' by ${req.user.username}.`,
      link: `/invitations`,
      relatedGroup: groupId,
      relatedUser: req.user.id,
    });

    await audit.log({
      actor: req.user.id,
      action: 'membership.invite_created',
      entityType: 'group_membership',
      entityId: membership._id,
      relatedGroup: groupId,
      snapshot: { targetUser: targetUser._id },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent.',
      data: {
        membershipId: membership._id,
        recipient: { username: targetUser.username, displayName: targetUser.displayName },
        expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── 11. List Group's Sent Invitations ─────────────────────────────────────────
async function getGroupInvitations(req, res, next) {
  try {
    const { groupId } = req.params;
    const invites = await GroupMembership.find({
      group: groupId,
      status: 'invited',
      inviteExpiresAt: { $gt: new Date() },
    })
      .populate('user', 'username displayName avatarUrl')
      .populate('invitedBy', 'username displayName')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (err) {
    next(err);
  }
}

// ── 12. Revoke an Invitation ──────────────────────────────────────────────────
async function revokeInvitation(req, res, next) {
  try {
    const { groupId, inviteId } = req.params;
    const invite = await GroupMembership.findOne({
      _id: inviteId,
      group: groupId,
      status: 'invited',
    });
    if (!invite) return next(new AppError('Active invitation not found.', 404, 'NOT_FOUND'));

    invite.status = 'revoked';
    await invite.save();

    await Notification.create({
      recipient: invite.user,
      type: 'invite_revoked',
      title: 'Invitation revoked',
      body: 'An invitation to join a group was revoked.',
      relatedGroup: groupId,
    });

    await audit.log({
      actor: req.user.id,
      action: 'membership.invite_revoked',
      entityType: 'group_membership',
      entityId: invite._id,
      relatedGroup: groupId,
      snapshot: { user: invite.user },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Invitation revoked.' });
  } catch (err) {
    next(err);
  }
}

// ── 13. Get Current User's Received Invitations ───────────────────────────────
async function getMyInvitations(req, res, next) {
  try {
    const invites = await GroupMembership.find({
      user: req.user.id,
      status: 'invited',
      inviteExpiresAt: { $gt: new Date() },
    })
      .populate('group', 'title description slug groupType category memberCount maxMembers targetAmountPaise')
      .populate('invitedBy', 'username displayName avatarUrl')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (err) {
    next(err);
  }
}

// ── 14. Respond to Received Invitation (Accept / Decline) ─────────────────────
async function respondToInvitation(req, res, next) {
  try {
    const { inviteId } = req.params;
    const { action } = req.body; // 'accept' | 'decline'

    if (!['accept', 'decline'].includes(action)) {
      return next(new AppError('Action must be "accept" or "decline".', 400, 'INVALID_ACTION'));
    }

    const invite = await GroupMembership.findOne({
      _id: inviteId,
      user: req.user.id,
      status: 'invited',
    });
    if (!invite) return next(new AppError('Invitation not found.', 404, 'NOT_FOUND'));

    // Check expiration
    if (invite.inviteExpiresAt && invite.inviteExpiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      return next(new AppError('This invitation has expired.', 400, 'INVITATION_EXPIRED'));
    }

    const group = await Group.findById(invite.group);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    if (action === 'accept') {
      if (group.memberCount >= group.maxMembers) {
        return next(new AppError('Group has reached maximum capacity.', 400, 'GROUP_FULL'));
      }

      invite.status = 'active';
      invite.role = 'member';
      invite.joinedAt = new Date();
      await invite.save();

      await Group.findByIdAndUpdate(group._id, { $inc: { memberCount: 1 } });

      await audit.log({
        actor: req.user.id,
        action: 'membership.invite_accepted',
        entityType: 'group_membership',
        entityId: invite._id,
        relatedGroup: group._id,
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Invitation accepted.', data: invite });
    } else {
      invite.status = 'declined';
      await invite.save();

      await audit.log({
        actor: req.user.id,
        action: 'membership.invite_declined',
        entityType: 'group_membership',
        entityId: invite._id,
        relatedGroup: group._id,
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Invitation declined.' });
    }
  } catch (err) {
    next(err);
  }
}

// ── 15. Update Member Role (Role Changes & Escalation Guard) ───────────────────
async function updateMemberRole(req, res, next) {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;

    const allowedRoles = ['moderator', 'member', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return next(new AppError(`Invalid role. Allowed: [${allowedRoles.join(', ')}]`, 400, 'INVALID_ROLE'));
    }

    const targetMembership = await GroupMembership.findOne({
      _id: memberId,
      group: groupId,
      status: 'active',
    });
    if (!targetMembership) return next(new AppError('Active member not found.', 404, 'NOT_FOUND'));

    // Prevent changing own role (prevents accidental self-lockout)
    if (targetMembership.user.toString() === req.user.id.toString()) {
      return next(new AppError('You cannot change your own role directly.', 400, 'CANNOT_CHANGE_OWN_ROLE'));
    }

    // Owner role cannot be demoted with this endpoint
    if (targetMembership.role === 'owner') {
      return next(new AppError('Owner role cannot be changed via role update.', 400, 'CANNOT_MODIFY_OWNER'));
    }

    const oldRole = targetMembership.role;
    targetMembership.role = role;
    targetMembership.roleChangedAt = new Date();
    await targetMembership.save();

    await Notification.create({
      recipient: targetMembership.user,
      type: 'role_changed',
      title: 'Your role changed',
      body: `Your role in the group was updated from ${oldRole} to ${role}.`,
      link: `/groups/${groupId}`,
      relatedGroup: groupId,
    });

    await audit.log({
      actor: req.user.id,
      action: 'membership.role_changed',
      entityType: 'group_membership',
      entityId: targetMembership._id,
      relatedGroup: groupId,
      snapshot: { user: targetMembership.user, oldRole, newRole: role },
      ipAddress: req.ip,
    });

    res.json({ success: true, data: targetMembership });
  } catch (err) {
    next(err);
  }
}

// ── 16. Remove Member ─────────────────────────────────────────────────────────
async function removeMember(req, res, next) {
  try {
    const { groupId, memberId } = req.params;
    const { reason = '' } = req.body;

    const targetMembership = await GroupMembership.findOne({
      _id: memberId,
      group: groupId,
      status: 'active',
    });
    if (!targetMembership) return next(new AppError('Active member not found.', 404, 'NOT_FOUND'));

    if (targetMembership.user.toString() === req.user.id.toString()) {
      return next(new AppError('To leave the group, use the leave endpoint.', 400, 'USE_LEAVE'));
    }

    // Owner can never be removed by anyone
    if (targetMembership.role === 'owner') {
      return next(new AppError('The group owner cannot be removed.', 403, 'CANNOT_REMOVE_OWNER'));
    }

    // If caller is moderator, cannot remove another moderator or admin
    if (req.membership && req.membership.role === 'moderator') {
      if (['owner', 'admin', 'moderator'].includes(targetMembership.role)) {
        return next(new AppError('Moderators cannot remove other moderators or owners.', 403, 'FORBIDDEN'));
      }
    }

    targetMembership.status = 'removed';
    targetMembership.removedAt = new Date();
    targetMembership.removalReason = reason;
    await targetMembership.save();

    await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: -1 } });

    await Notification.create({
      recipient: targetMembership.user,
      type: 'member_removed',
      title: 'Removed from group',
      body: reason ? `You were removed from the group: ${reason}` : 'You were removed from the group.',
      relatedGroup: groupId,
    });

    await audit.log({
      actor: req.user.id,
      action: 'membership.removed',
      entityType: 'group_membership',
      entityId: targetMembership._id,
      relatedGroup: groupId,
      snapshot: { user: targetMembership.user, reason },
      ipAddress: req.ip,
      severity: 'warning',
    });

    res.json({ success: true, message: 'Member removed successfully.' });
  } catch (err) {
    next(err);
  }
}

// ── 17. Leave Group & Ownership Succession ────────────────────────────────────
async function leaveGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const { newOwnerId } = req.body;

    const callerMembership = await GroupMembership.findOne({
      group: groupId,
      user: req.user.id,
      status: 'active',
    });
    if (!callerMembership) return next(new AppError('You are not an active member of this group.', 404, 'NOT_FOUND'));

    const group = await Group.findById(groupId);
    if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

    // Handle Owner Departure with Safe Succession
    if (callerMembership.role === 'owner') {
      const otherMembers = await GroupMembership.find({
        group: groupId,
        status: 'active',
        user: { $ne: req.user.id },
      }).sort({ joinedAt: 1 });

      if (otherMembers.length === 0) {
        // No remaining members — automatically cancel group
        group.status = 'cancelled';
        await group.save();

        callerMembership.status = 'left';
        callerMembership.leftAt = new Date();
        await callerMembership.save();
        await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: -1 } });

        await audit.log({
          actor: req.user.id,
          action: 'group.cancelled',
          entityType: 'group',
          entityId: group._id,
          relatedGroup: group._id,
          snapshot: { reason: 'Sole owner left; group cancelled automatically.' },
          ipAddress: req.ip,
        });

        return res.json({
          success: true,
          message: 'You left the group. Since you were the sole member, the group has been cancelled.',
        });
      }

      let successor = null;
      if (newOwnerId) {
        successor = otherMembers.find((m) => m.user.toString() === newOwnerId.toString());
        if (!successor) {
          return next(new AppError('Specified successor must be an active member of this group.', 400, 'INVALID_SUCCESSOR'));
        }
      } else {
        // Automatic succession: promote earliest joined moderator, or earliest joined member
        const modSuccessor = otherMembers.find((m) => m.role === 'moderator');
        successor = modSuccessor || otherMembers[0];
      }

      successor.role = 'owner';
      successor.roleChangedAt = new Date();
      await successor.save();

      callerMembership.status = 'left';
      callerMembership.leftAt = new Date();
      await callerMembership.save();
      await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: -1 } });

      await Notification.create({
        recipient: successor.user,
        type: 'role_changed',
        title: 'You are now the group owner!',
        body: `Previous owner departed. Ownership of '${group.title}' was transferred to you.`,
        link: `/groups/${groupId}`,
        relatedGroup: groupId,
      });

      await audit.log({
        actor: req.user.id,
        action: 'membership.ownership_transferred',
        entityType: 'group_membership',
        entityId: successor._id,
        relatedGroup: groupId,
        snapshot: { previousOwner: req.user.id, newOwner: successor.user },
        ipAddress: req.ip,
        severity: 'warning',
      });

      return res.json({
        success: true,
        message: 'Left group successfully. Ownership was safely transferred.',
      });
    }

    // Non-owner departure
    callerMembership.status = 'left';
    callerMembership.leftAt = new Date();
    await callerMembership.save();
    await Group.findByIdAndUpdate(groupId, { $inc: { memberCount: -1 } });

    await audit.log({
      actor: req.user.id,
      action: 'membership.left',
      entityType: 'group_membership',
      entityId: callerMembership._id,
      relatedGroup: groupId,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Left group successfully.' });
  } catch (err) {
    next(err);
  }
}

// ── 18. Join via Invite Code (Public/Unlisted with Code) ───────────────────────
async function joinViaInvite(req, res, next) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return next(new AppError('Invite code is required.', 400, 'MISSING_INVITE_CODE'));

    const group = await Group.findOne({ inviteCode });
    if (!group) return next(new AppError('Invalid invite code.', 404, 'NOT_FOUND'));

    if (['cancelled', 'completed'].includes(group.status)) {
      return next(new AppError(`Cannot join a ${group.status} group.`, 400, 'GROUP_INACTIVE'));
    }

    const existing = await GroupMembership.findOne({ group: group._id, user: req.user.id });
    if (existing && existing.status === 'active') {
      return next(new AppError('Already a member.', 409, 'ALREADY_MEMBER'));
    }

    if (group.memberCount >= group.maxMembers) {
      return next(new AppError('Group is full.', 400, 'GROUP_FULL'));
    }

    let membership;
    if (existing) {
      existing.status = 'active';
      existing.role = 'member';
      existing.joinedAt = new Date();
      membership = await existing.save();
    } else {
      membership = await GroupMembership.create({
        group: group._id,
        user: req.user.id,
        role: 'member',
        status: 'active',
        joinedAt: new Date(),
      });
    }

    await Group.findByIdAndUpdate(group._id, { $inc: { memberCount: 1 } });

    await audit.log({
      actor: req.user.id,
      action: 'membership.joined_via_code',
      entityType: 'group_membership',
      entityId: membership._id,
      relatedGroup: group._id,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: { group, membership } });
  } catch (err) {
    next(err);
  }
}

// ── 19. Get My Groups ─────────────────────────────────────────────────────────
async function getMyGroups(req, res, next) {
  try {
    const memberships = await GroupMembership.find({ user: req.user.id, status: 'active' })
      .populate({
        path: 'group',
        populate: { path: 'createdBy', select: 'username displayName avatarUrl' },
      })
      .sort({ joinedAt: -1 });

    res.json({ success: true, data: memberships });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createGroup,
  discoverGroups,
  getGroup,
  updateGroup,
  cancelGroup,
  getGroupMembers,
  requestJoin,
  getJoinRequests,
  handleJoinRequest,
  createInvitation,
  getGroupInvitations,
  revokeInvitation,
  getMyInvitations,
  respondToInvitation,
  updateMemberRole,
  removeMember,
  leaveGroup,
  joinViaInvite,
  getMyGroups,
};
