'use strict';
/**
 * Phase 3 Test Suite: Groups, Discovery, Membership & Invitations
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Group;
let GroupMembership;
let Notification;
let AuditLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  User = require('../src/models/User');
  Group = require('../src/models/Group');
  GroupMembership = require('../src/models/GroupMembership');
  Notification = require('../src/models/Notification');
  AuditLog = require('../src/models/AuditLog');

  const { app: expressApp } = require('../src/app');
  app = expressApp;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Helper: register & login user
async function createUser(email, username, password = 'Password123!') {
  await request(app).post('/api/auth/register').send({
    email,
    username,
    password,
    displayName: `${username} Display`,
  });

  const res = await request(app).post('/api/auth/login').send({
    email,
    password,
  });

  const userDoc = await User.findOne({ email });
  return {
    token: res.body.data.accessToken,
    user: userDoc,
  };
}

describe('Phase 3: Group Creation & Server Validation', () => {
  test('Creates group and automatically designates creator as owner', async () => {
    const { token, user } = await createUser('creator@test.com', 'creatoruser');

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: '3D Printer Workshop Hub',
        description: 'Community pooling for commercial grade 3D printer',
        groupType: 'shared_equipment',
        category: 'workshop',
        visibility: 'public',
        targetAmountPaise: 2500000, // ₹25,000.00
        minContributionPaise: 50000, // ₹500.00
        maxContributionPaise: 500000,
        minMembers: 3,
        maxMembers: 10,
        rules: 'Keep equipment clean and log all print hours.',
        cancellationRules: 'Refundable until target reached.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('3D Printer Workshop Hub');
    expect(res.body.data.targetAmountPaise).toBe(2500000);
    expect(res.body.data.memberCount).toBe(1);

    // Verify creator is owner in GroupMembership
    const membership = await GroupMembership.findOne({
      group: res.body.data._id,
      user: user._id,
      status: 'active',
    });
    expect(membership).toBeTruthy();
    expect(membership.role).toBe('owner');
  });

  test('Rejects creation when required fields or validation bounds fail', async () => {
    const { token } = await createUser('fail@test.com', 'failuser');

    // Missing title and groupType
    const res1 = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'No title or type',
        category: 'electronics',
      });
    expect(res1.status).toBe(400);

    // minMembers > maxMembers
    const res2 = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Invalid Bounds Group',
        description: 'Min is greater than max',
        groupType: 'collective_purchase',
        category: 'electronics',
        minMembers: 15,
        maxMembers: 5,
      });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('INVALID_MIN_MEMBERS');
  });
});

describe('Phase 3: Visibility Enforcement & Non-Leakage', () => {
  test('Discovery only returns public groups; unlisted and private are never leaked', async () => {
    const { token } = await createUser('admin1@test.com', 'admin1');

    // Public group
    await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({
      title: 'Public Coffee Roaster',
      description: 'Public group',
      groupType: 'shared_equipment',
      category: 'workshop',
      visibility: 'public',
    });

    // Unlisted group
    await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({
      title: 'Secret Unlisted Purchase',
      description: 'Hidden from discovery',
      groupType: 'collective_purchase',
      category: 'electronics',
      visibility: 'unlisted',
    });

    // Private group
    await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({
      title: 'Confidential Business Venture',
      description: 'Private group',
      groupType: 'business_venture',
      category: 'services',
      visibility: 'private',
    });

    const discoverRes = await request(app).get('/api/groups');
    expect(discoverRes.status).toBe(200);
    expect(discoverRes.body.data.length).toBe(1);
    expect(discoverRes.body.data[0].title).toBe('Public Coffee Roaster');
    expect(discoverRes.body.data[0].inviteCode).toBeUndefined();
  });

  test('Private group returns 404 to unauthorized users (no disclosure of existence)', async () => {
    const { token: ownerToken } = await createUser('owner@test.com', 'owneruser');
    const { token: strangerToken } = await createUser('stranger@test.com', 'strangeruser');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Secret Vault Group',
        description: 'Private',
        groupType: 'collective_purchase',
        category: 'electronics',
        visibility: 'private',
      });
    const groupId = groupRes.body.data._id;

    // Stranger gets 404
    const strangerRes = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(strangerRes.status).toBe(404);

    // Stranger cannot fetch members list (404)
    const membersRes = await request(app)
      .get(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(membersRes.status).toBe(404);

    // Owner can view details
    const ownerRes = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.title).toBe('Secret Vault Group');
  });

  test('Unlisted group is accessible directly with ID but omitted from public list', async () => {
    const { token: ownerToken } = await createUser('uowner@test.com', 'uowner');
    const { token: viewerToken } = await createUser('uviewer@test.com', 'uviewer');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Direct Link Only Group',
        description: 'Unlisted',
        groupType: 'collective_purchase',
        category: 'electronics',
        visibility: 'unlisted',
      });
    const groupId = groupRes.body.data._id;

    // Direct fetch works
    const viewRes = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.data.title).toBe('Direct Link Only Group');
    expect(viewRes.body.data.inviteCode).toBeUndefined(); // hidden from non-admin
  });
});

describe('Phase 3: Join Requests & Approvals', () => {
  test('Join request lifecycle: submit, approve, reject, capacity limit', async () => {
    const { token: ownerToken } = await createUser('lead@test.com', 'leaduser');
    const { token: user1Token, user: user1 } = await createUser('applicant1@test.com', 'applicant1');
    const { token: user2Token } = await createUser('applicant2@test.com', 'applicant2');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Limited Capacity Studio',
        description: 'Max 2 members',
        groupType: 'shared_equipment',
        category: 'photography',
        visibility: 'public',
        maxMembers: 2,
      });
    const groupId = groupRes.body.data._id;

    // User1 requests join
    const req1 = await request(app)
      .post(`/api/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(req1.status).toBe(201);
    expect(req1.body.data.status).toBe('pending');

    // Duplicate join request is rejected with 409
    const dupReq = await request(app)
      .post(`/api/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(dupReq.status).toBe(409);
    expect(dupReq.body.error.code).toBe('REQUEST_PENDING');

    // Owner views join requests
    const listReqs = await request(app)
      .get(`/api/groups/${groupId}/requests`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listReqs.status).toBe(200);
    expect(listReqs.body.data.length).toBe(1);
    const memberId = listReqs.body.data[0]._id;

    // Owner approves User1
    const approveRes = await request(app)
      .patch(`/api/groups/${groupId}/requests/${memberId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ decision: 'approve' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('active');

    // Notification created for applicant
    const notif = await Notification.findOne({ recipient: user1._id, type: 'join_approved' });
    expect(notif).toBeTruthy();

    // Group is now at max capacity (owner + user1 = 2)
    const req2 = await request(app)
      .post(`/api/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(req2.status).toBe(400);
    expect(req2.body.error.code).toBe('GROUP_FULL');
  });
});

describe('Phase 3: Invitations (Invite, Accept, Revoke, Expiry)', () => {
  test('Invite specific user, accept invitation, and revoke invitation', async () => {
    const { token: ownerToken } = await createUser('host@test.com', 'hostuser');
    const { token: guestToken, user: guest } = await createUser('guest@test.com', 'guestuser');
    const { token: revGuestToken, user: revGuest } = await createUser('rev@test.com', 'revuser');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Invite Only Drone Fleet',
        description: 'Drone pooling',
        groupType: 'shared_equipment',
        category: 'electronics',
        visibility: 'private',
        maxMembers: 5,
      });
    const groupId = groupRes.body.data._id;

    // Owner invites guest
    const invRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: 'guestuser' });
    expect(invRes.status).toBe(201);
    const inviteId = invRes.body.data.membershipId;

    // Notification created for guest
    const guestNotif = await Notification.findOne({ recipient: guest._id, type: 'group_invite' });
    expect(guestNotif).toBeTruthy();

    // Guest views invitations
    const myInvites = await request(app)
      .get('/api/groups/my/invitations')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(myInvites.status).toBe(200);
    expect(myInvites.body.data.length).toBe(1);

    // Guest accepts invitation
    const acceptRes = await request(app)
      .post(`/api/groups/invitations/${inviteId}/respond`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ action: 'accept' });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('active');

    // Owner invites revGuest then revokes
    const inv2 = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: revGuest.email });
    expect(inv2.status).toBe(201);
    const inviteId2 = inv2.body.data.membershipId;

    const revokeRes = await request(app)
      .delete(`/api/groups/${groupId}/invitations/${inviteId2}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(revokeRes.status).toBe(200);

    const revokedMem = await GroupMembership.findById(inviteId2);
    expect(revokedMem.status).toBe('revoked');
  });

  test('Expired invitation cannot be accepted', async () => {
    const { token: ownerToken } = await createUser('expowner@test.com', 'expowner');
    const { token: guestToken } = await createUser('expguest@test.com', 'expguest');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Expiry Test Group',
        description: 'Expiry test',
        groupType: 'collective_purchase',
        category: 'electronics',
      });
    const groupId = groupRes.body.data._id;

    const invRes = await request(app)
      .post(`/api/groups/${groupId}/invitations`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: 'expguest' });
    const inviteId = invRes.body.data.membershipId;

    // Manually expire the invitation
    await GroupMembership.findByIdAndUpdate(inviteId, {
      inviteExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });

    const res = await request(app)
      .post(`/api/groups/invitations/${inviteId}/respond`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ action: 'accept' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVITATION_EXPIRED');
  });
});

describe('Phase 3: Roles, Permissions & Escalation Guards', () => {
  test('Regular member cannot promote themselves or modify roles', async () => {
    const { token: ownerToken } = await createUser('roleowner@test.com', 'roleowner');
    const { token: memberToken, user: memberUser } = await createUser('rolemember@test.com', 'rolemember');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Escalation Test Group',
        description: 'Test roles',
        groupType: 'shared_equipment',
        category: 'printing',
      });
    const groupId = groupRes.body.data._id;

    // Join & approve
    const joinRes = await request(app).post(`/api/groups/${groupId}/join`).set('Authorization', `Bearer ${memberToken}`);
    const memId = joinRes.body.data._id;
    await request(app).patch(`/api/groups/${groupId}/requests/${memId}`).set('Authorization', `Bearer ${ownerToken}`).send({ decision: 'approve' });

    // Member attempts to promote themselves to moderator
    const hackRes = await request(app)
      .patch(`/api/groups/${groupId}/members/${memId}/role`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ role: 'moderator' });
    expect(hackRes.status).toBe(403);

    // Owner promotes member to moderator
    const legitRes = await request(app)
      .patch(`/api/groups/${groupId}/members/${memId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'moderator' });
    expect(legitRes.status).toBe(200);
    expect(legitRes.body.data.role).toBe('moderator');
  });

  test('Member removal guards: moderator cannot remove owner', async () => {
    const { token: ownerToken } = await createUser('own@test.com', 'ownuser');
    const { token: modToken } = await createUser('mod@test.com', 'moduser');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Removal Guard Group',
        description: 'Removal test',
        groupType: 'collective_purchase',
        category: 'services',
      });
    const groupId = groupRes.body.data._id;

    // Add and promote mod
    const jRes = await request(app).post(`/api/groups/${groupId}/join`).set('Authorization', `Bearer ${modToken}`);
    await request(app).patch(`/api/groups/${groupId}/requests/${jRes.body.data._id}`).set('Authorization', `Bearer ${ownerToken}`).send({ decision: 'approve' });
    await request(app).patch(`/api/groups/${groupId}/members/${jRes.body.data._id}/role`).set('Authorization', `Bearer ${ownerToken}`).send({ role: 'moderator' });

    // Find owner membership
    const ownerMem = await GroupMembership.findOne({ group: groupId, role: 'owner' });

    // Mod attempts to remove owner
    const removeRes = await request(app)
      .delete(`/api/groups/${groupId}/members/${ownerMem._id}`)
      .set('Authorization', `Bearer ${modToken}`);
    expect(removeRes.status).toBe(403);
  });
});

describe('Phase 3: Voluntary Departure & Ownership Succession', () => {
  test('Owner departure transfers ownership to designated successor', async () => {
    const { token: ownerToken, user: oldOwner } = await createUser('oldown@test.com', 'oldowner');
    const { token: memberToken, user: newOwner } = await createUser('newown@test.com', 'newowner');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Succession Group',
        description: 'Succession test',
        groupType: 'shared_equipment',
        category: 'workshop',
      });
    const groupId = groupRes.body.data._id;

    // Member joins
    const jRes = await request(app).post(`/api/groups/${groupId}/join`).set('Authorization', `Bearer ${memberToken}`);
    await request(app).patch(`/api/groups/${groupId}/requests/${jRes.body.data._id}`).set('Authorization', `Bearer ${ownerToken}`).send({ decision: 'approve' });

    // Owner leaves with explicit successor
    const leaveRes = await request(app)
      .post(`/api/groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ newOwnerId: newOwner._id.toString() });
    expect(leaveRes.status).toBe(200);

    // Verify new owner has role 'owner'
    const succMem = await GroupMembership.findOne({ group: groupId, user: newOwner._id });
    expect(succMem.role).toBe('owner');
    expect(succMem.status).toBe('active');

    // Old owner is marked 'left'
    const oldMem = await GroupMembership.findOne({ group: groupId, user: oldOwner._id });
    expect(oldMem.status).toBe('left');
  });

  test('Sole owner departure automatically cancels group', async () => {
    const { token: soleToken } = await createUser('sole@test.com', 'soleowner');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${soleToken}`)
      .send({
        title: 'Solo Departure Group',
        description: 'Sole owner',
        groupType: 'collective_purchase',
        category: 'vehicles',
      });
    const groupId = groupRes.body.data._id;

    const leaveRes = await request(app)
      .post(`/api/groups/${groupId}/leave`)
      .set('Authorization', `Bearer ${soleToken}`)
      .send({});
    expect(leaveRes.status).toBe(200);

    const groupDoc = await Group.findById(groupId);
    expect(groupDoc.status).toBe('cancelled');
  });
});

describe('Phase 3: Lifecycle Transition Integrity', () => {
  test('Permitted lifecycle transitions succeed', async () => {
    const { token: ownerToken } = await createUser('lifecycle@test.com', 'lifecycleowner');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Lifecycle Valid Group',
        description: 'Valid transitions',
        groupType: 'collective_purchase',
        category: 'electronics',
      });
    const groupId = groupRes.body.data._id;

    // open -> funding
    const res1 = await request(app)
      .patch(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'funding' });
    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('funding');

    // funding -> funded
    const res2 = await request(app)
      .patch(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'funded' });
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('funded');
  });

  test('Arbitrary and backwards lifecycle transitions fail', async () => {
    const { token: ownerToken } = await createUser('badstate@test.com', 'badstateowner');

    const groupRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Bad State Jump Group',
        description: 'Bad transition',
        groupType: 'collective_purchase',
        category: 'electronics',
      });
    const groupId = groupRes.body.data._id;

    // Illegal jump: open -> completed (not allowed directly)
    const badRes = await request(app)
      .patch(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'completed' });
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe('ILLEGAL_STATUS_TRANSITION');
  });
});

describe('Phase 3: Discovery Filtering & Pagination', () => {
  test('Filters by category, budget range, and capacity', async () => {
    const { token } = await createUser('filter@test.com', 'filteruser');

    // Group 1: electronics, target 100000 paise (₹1000)
    await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({
      title: 'Group 1 Budget Tech',
      description: 'Budget',
      groupType: 'collective_purchase',
      category: 'electronics',
      targetAmountPaise: 100000,
    });

    // Group 2: photography, target 500000 paise (₹5000)
    await request(app).post('/api/groups').set('Authorization', `Bearer ${token}`).send({
      title: 'Group 2 High End Camera',
      description: 'Camera gear',
      groupType: 'shared_equipment',
      category: 'photography',
      targetAmountPaise: 500000,
    });

    // Filter category = photography
    const resCat = await request(app).get('/api/groups?category=photography');
    expect(resCat.status).toBe(200);
    expect(resCat.body.data.length).toBe(1);
    expect(resCat.body.data[0].title).toBe('Group 2 High End Camera');

    // Filter budget maxTargetPaise = 200000
    const resBudget = await request(app).get('/api/groups?maxTargetPaise=200000');
    expect(resBudget.status).toBe(200);
    expect(resBudget.body.data.length).toBe(1);
    expect(resBudget.body.data[0].title).toBe('Group 1 Budget Tech');

    // Search query
    const resSearch = await request(app).get('/api/groups?search=camera');
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.data.length).toBe(1);
  });
});
