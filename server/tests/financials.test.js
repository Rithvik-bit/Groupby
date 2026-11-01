'use strict';
/**
 * Test Suite: Group Financial Ledger & Expense Tracking
 * Tests creation of revenue/expense records, threshold approval workflows,
 * access control isolation, and aggregate financial metrics.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Group;
let GroupMembership;
let FinancialEntry;
let Notification;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  User = require('../src/models/User');
  Group = require('../src/models/Group');
  GroupMembership = require('../src/models/GroupMembership');
  FinancialEntry = require('../src/models/FinancialEntry');
  Notification = require('../src/models/Notification');

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

async function createUser(email, username, password = 'Password123!') {
  await request(app).post('/api/auth/register').send({
    email,
    username,
    password,
    displayName: `${username} Display`,
  });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { token: res.body.data.accessToken, user: res.body.data.user };
}

describe('Financial Ledger & Expense Tracking API', () => {
  let leader;
  let member;
  let outsider;
  let testGroup;

  beforeEach(async () => {
    leader = await createUser('leader@test.com', 'leader_user');
    member = await createUser('member@test.com', 'member_user');
    outsider = await createUser('outsider@test.com', 'outsider_user');

    testGroup = await Group.create({
      title: 'Shared Studio Gear Co-op',
      description: 'Shared co-op for video equipment',
      slug: 'shared-studio-gear-' + Date.now(),
      groupType: 'shared_equipment',
      category: 'photography',
      visibility: 'public',
      createdBy: leader.user.id,
      expenseApprovalThresholdPaise: 100000, // ₹1,000 threshold
      status: 'active',
      memberCount: 2,
    });

    await GroupMembership.insertMany([
      { group: testGroup._id, user: leader.user.id, role: 'owner', status: 'active' },
      { group: testGroup._id, user: member.user.id, role: 'member', status: 'active' },
    ]);
  });

  describe('POST /api/groups/:groupId/financials', () => {
    it('allows a member to record a sub-threshold expense without requiring approval', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          entryType: 'expense',
          amountPaise: 45000, // ₹450 (< ₹1,000 threshold)
          description: 'Cleaning fluid and sensor swabs',
          category: 'supplies',
          documentReference: 'Receipt #REC-101',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amountPaise).toBe(45000);
      expect(res.body.data.requiresApproval).toBe(false);
      expect(res.body.data.approvalStatus).toBe('not_required');
    });

    it('flags high-value expense by regular member as pending approval and notifies leaders', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          entryType: 'expense',
          amountPaise: 300000, // ₹3,000 (>= ₹1,000 threshold)
          description: 'New wireless audio transmitter kit',
          category: 'equipment',
          documentReference: 'Invoice #INV-9902',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.requiresApproval).toBe(true);
      expect(res.body.data.approvalStatus).toBe('pending');

      // Check notification sent to leader
      const notif = await Notification.findOne({ recipient: leader.user.id });
      expect(notif).not.toBeNull();
      expect(notif.type).toBe('expense_approval_needed');
    });

    it('auto-approves high-value expenses when recorded directly by a group leader', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${leader.token}`)
        .send({
          entryType: 'expense',
          amountPaise: 500000, // ₹5,000
          description: 'Replacement heavy-duty carbon tripod',
          category: 'equipment',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.requiresApproval).toBe(false);
      expect(res.body.data.approvalStatus).toBe('approved');
    });

    it('allows recording group revenue entries', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          entryType: 'revenue',
          amountPaise: 250000, // ₹2,500
          description: 'Commercial shoot day rental fee from external client',
          category: 'revenue',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.entryType).toBe('revenue');
      expect(res.body.data.amountPaise).toBe(250000);
    });

    it('rejects invalid amounts or missing descriptions', async () => {
      const badAmount = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          entryType: 'expense',
          amountPaise: -500,
          description: 'Invalid',
        });
      expect(badAmount.status).toBe(400);

      const noDesc = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          entryType: 'expense',
          amountPaise: 5000,
          description: '',
        });
      expect(noDesc.status).toBe(400);
    });

    it('blocks outsiders from recording expenses in the group', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({
          entryType: 'expense',
          amountPaise: 10000,
          description: 'Outsider expense',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/groups/:groupId/financials/:entryId/approve', () => {
    let pendingEntry;

    beforeEach(async () => {
      pendingEntry = await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: member.user.id,
        entryType: 'expense',
        amountPaise: 250000,
        description: 'New zoom lens rental',
        category: 'equipment',
        requiresApproval: true,
        approvalStatus: 'pending',
      });
    });

    it('allows a group leader to approve a pending expense and notifies member', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroup._id}/financials/${pendingEntry._id}/approve`)
        .set('Authorization', `Bearer ${leader.token}`)
        .send({
          decision: 'approved',
          note: 'Approved for upcoming project shoot',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('approved');
      expect(res.body.data.approvals.length).toBe(1);
      expect(res.body.data.approvals[0].decision).toBe('approved');

      // Check member notification
      const notif = await Notification.findOne({ recipient: member.user.id, type: 'expense_approved' });
      expect(notif).not.toBeNull();
    });

    it('allows a group leader to reject a pending expense', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroup._id}/financials/${pendingEntry._id}/approve`)
        .set('Authorization', `Bearer ${leader.token}`)
        .send({
          decision: 'rejected',
          note: 'Not budgeted for this month',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('rejected');
    });

    it('prevents regular members from approving expenses', async () => {
      const res = await request(app)
        .patch(`/api/groups/${testGroup._id}/financials/${pendingEntry._id}/approve`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({
          decision: 'approved',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/groups/:groupId/financials', () => {
    beforeEach(async () => {
      // 1 approved expense: ₹1,500
      await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: leader.user.id,
        entryType: 'expense',
        amountPaise: 150000,
        description: 'Lens calibration',
        approvalStatus: 'approved',
      });

      // 1 unrequired expense: ₹500
      await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: member.user.id,
        entryType: 'expense',
        amountPaise: 50000,
        description: 'Gaffer tape',
        approvalStatus: 'not_required',
      });

      // 1 revenue: ₹4,000
      await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: leader.user.id,
        entryType: 'revenue',
        amountPaise: 400000,
        description: 'Commercial shoot fee',
        approvalStatus: 'not_required',
      });

      // 1 pending expense: ₹2,000 (should not be in totals until approved)
      await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: member.user.id,
        entryType: 'expense',
        amountPaise: 200000,
        description: 'Battery grips',
        approvalStatus: 'pending',
      });
    });

    it('returns ledger entries and accurate financial summary calculations', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entries.length).toBe(4);

      const summary = res.body.data.summary;
      // Total expenses = 150000 + 50000 = 200000 paise (₹2,000)
      expect(summary.totalExpensesPaise).toBe(200000);
      // Total revenue = 400000 paise (₹4,000)
      expect(summary.totalRevenuesPaise).toBe(400000);
      // Net balance = 400000 - 200000 = 200000 paise (₹2,000)
      expect(summary.netBalancePaise).toBe(200000);
      // Pending count = 1, pending amount = 200000
      expect(summary.pendingApprovalCount).toBe(1);
      expect(summary.pendingApprovalAmountPaise).toBe(200000);
    });

    it('blocks non-members from viewing financial records', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroup._id}/financials`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/groups/:groupId/financials/:entryId', () => {
    it('allows a member to delete their own pending expense', async () => {
      const entry = await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: member.user.id,
        entryType: 'expense',
        amountPaise: 120000,
        description: 'Mistake entry',
        approvalStatus: 'pending',
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroup._id}/financials/${entry._id}`)
        .set('Authorization', `Bearer ${member.token}`);

      expect(res.status).toBe(200);
      const found = await FinancialEntry.findById(entry._id);
      expect(found).toBeNull();
    });

    it('allows group leader to delete any entry', async () => {
      const entry = await FinancialEntry.create({
        group: testGroup._id,
        recordedBy: member.user.id,
        entryType: 'expense',
        amountPaise: 30000,
        description: 'Minor supply',
        approvalStatus: 'not_required',
      });

      const res = await request(app)
        .delete(`/api/groups/${testGroup._id}/financials/${entry._id}`)
        .set('Authorization', `Bearer ${leader.token}`);

      expect(res.status).toBe(200);
      const found = await FinancialEntry.findById(entry._id);
      expect(found).toBeNull();
    });
  });
});
