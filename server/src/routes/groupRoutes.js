'use strict';
const express = require('express');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireMembership, requireGroupAdmin, requireGroupOwner } = require('../middleware/membership');
const groupCtrl = require('../controllers/groupController');

const router = express.Router();

// ── Discovery & User Group Queries ──────────────────────────────────────────
router.get('/', optionalAuthenticate, groupCtrl.discoverGroups);
router.get('/my', authenticate, groupCtrl.getMyGroups);
router.get('/my/invitations', authenticate, groupCtrl.getMyInvitations);
router.post('/invitations/:inviteId/respond', authenticate, groupCtrl.respondToInvitation);

// ── Join via invite code (must be before :groupId param) ──────────────────────
router.post('/join-invite', authenticate, groupCtrl.joinViaInvite);

// ── Create Group ─────────────────────────────────────────────────────────────
router.post('/', authenticate, groupCtrl.createGroup);

// ── Single Group Details ─────────────────────────────────────────────────────
router.get('/:groupId', optionalAuthenticate, groupCtrl.getGroup);
router.patch('/:groupId', authenticate, requireGroupAdmin, groupCtrl.updateGroup);
router.post('/:groupId/cancel', authenticate, requireGroupOwner, groupCtrl.cancelGroup);

// ── Members & Requests ───────────────────────────────────────────────────────
router.get('/:groupId/members', authenticate, requireMembership(), groupCtrl.getGroupMembers);
router.get('/:groupId/requests', authenticate, requireGroupAdmin, groupCtrl.getJoinRequests);
router.post('/:groupId/join', authenticate, groupCtrl.requestJoin);
router.patch('/:groupId/requests/:memberId', authenticate, requireGroupAdmin, groupCtrl.handleJoinRequest);

// ── Group Invitations (Leader-managed) ────────────────────────────────────────
router.get('/:groupId/invitations', authenticate, requireGroupAdmin, groupCtrl.getGroupInvitations);
router.post('/:groupId/invitations', authenticate, requireGroupAdmin, groupCtrl.createInvitation);
router.delete('/:groupId/invitations/:inviteId', authenticate, requireGroupAdmin, groupCtrl.revokeInvitation);

// ── Roles, Removal & Voluntary Departure ─────────────────────────────────────
router.patch('/:groupId/members/:memberId/role', authenticate, requireGroupOwner, groupCtrl.updateMemberRole);
router.delete('/:groupId/members/:memberId', authenticate, requireGroupAdmin, groupCtrl.removeMember);
router.post('/:groupId/leave', authenticate, groupCtrl.leaveGroup);

module.exports = router;
