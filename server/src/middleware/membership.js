'use strict';
/**
 * Group membership guard middleware.
 * Checks that req.user is an ACTIVE member of the group specified in req.params.groupId.
 * Must be used AFTER authenticate middleware.
 * Private groups block non-members completely.
 */
const GroupMembership = require('../models/GroupMembership');
const Group = require('../models/Group');
const AppError = require('../utils/AppError');

/**
 * requireMembership(options)
 * options.allowedRoles: array of group-level roles allowed (default: ['admin','moderator','member'])
 */
function requireMembership(options = {}) {
  const allowedRoles = options.allowedRoles || ['owner', 'admin', 'moderator', 'member', 'viewer'];

  return async (req, _res, next) => {
    try {
      const groupId = req.params.groupId || req.body.groupId;
      if (!groupId) return next(new AppError('Group ID required.', 400, 'MISSING_GROUP_ID'));

      // Check group existence and visibility
      const group = await Group.findById(groupId);
      if (!group) return next(new AppError('Group not found.', 404, 'NOT_FOUND'));

      // System admins bypass group membership checks
      if (req.user && req.user.role === 'admin') {
        req.group = group;
        return next();
      }

      const membership = await GroupMembership.findOne({
        group: groupId,
        user: req.user.id,
        status: 'active',
      });

      if (!membership) {
        // If private or unlisted, reveal nothing (404)
        if (group.visibility === 'private' || group.visibility === 'unlisted') {
          return next(new AppError('Group not found.', 404, 'NOT_FOUND'));
        }
        return next(new AppError('You are not a member of this group.', 403, 'NOT_MEMBER'));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(new AppError('Insufficient group role.', 403, 'INSUFFICIENT_ROLE'));
      }

      req.group = group;
      req.membership = membership;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * requireGroupAdmin — shorthand for group owner, admin or moderator
 */
const requireGroupAdmin = requireMembership({ allowedRoles: ['owner', 'admin', 'moderator'] });

/**
 * requireGroupOwner — shorthand for group owner or system admin
 */
const requireGroupOwner = requireMembership({ allowedRoles: ['owner', 'admin'] });

module.exports = { requireMembership, requireGroupAdmin, requireGroupOwner };
