'use strict';
/**
 * Test Suite: Ownership & Transfer API
 * Validates basis point equity allocation (10000 = 100%),
 * transfer proposal, buyer acceptance, administrator approval,
 * and double-spend protection.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Group;
let GroupMembership;
let OwnershipRecord;
let OwnershipTransfer;
let Contribution;
let Notification;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  User = require('../src/models/User');
  Group = require('../src/models/Group');
  GroupMembership = require('../src/models/GroupMembership');
  OwnershipRecord = require('../src/models/OwnershipRecord');
  OwnershipTransfer = require('../src/models/OwnershipTransfer');
  Contribution = require('../src/models/Contribution');
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

describe('Ownership & Transfer API', () => {
  let leader;
  let seller;
  let buyer;
  let outsider;
  let testGroup;

  beforeEach(async () => {
    leader = await createUser('leader@test.com', 'leader_user');
    seller = await createUser('seller@test.com', 'seller_user');
    buyer = await createUser('buyer@test.com', 'buyer_user');
    outsider = await createUser('outsider@test.com', 'outsider_user');

    testGroup = await Group.create({
      title: 'Cinematography Collective',
      description: 'Shared 4K cinema camera collective',
      slug: 'cinematography-collective-' + Date.now(),
      groupType: 'collective_purchase',
      category: 'photography',
      visibility: 'public',
      createdBy: leader.user.id,
      status: 'active',
      memberCount: 3,
    });

    await GroupMembership.insertMany([
      { group: testGroup._id, user: leader.user.id, role: 'owner', status: 'active' },
      { group: testGroup._id, user: seller.user.id, role: 'member', status: 'active' },
      { group: testGroup._id, user: buyer.user.id, role: 'member', status: 'active' },
    ]);
  });

  describe('GET /api/groups/:groupId/transfers/ownership', () => {
    it('returns empty records with 0 bps when no records or contributions exist', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroup._id}/transfers/ownership`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records).toHaveLength(0);
      expect(res.body.data.totalAllocatedBasisPoints).toBe(0);
    });

    it('blocks non-members from viewing group ownership records', async () => {
      const res = await request(app)
        .get(`/api/groups/${testGroup._id}/transfers/ownership`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/groups/:groupId/transfers/ownership/initialize', () => {
    it('allows a group leader to initialize custom basis point equity allocations', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers/ownership/initialize`)
        .set('Authorization', `Bearer ${leader.token}`)
        .send({
          distributions: [
            { userId: leader.user.id, basisPoints: 4000 },
            { userId: seller.user.id, basisPoints: 4000 },
            { userId: buyer.user.id, basisPoints: 2000 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);

      // Verify fetched ownership
      const checkRes = await request(app)
        .get(`/api/groups/${testGroup._id}/transfers/ownership`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.totalAllocatedBasisPoints).toBe(10000);
      expect(checkRes.body.data.myBasisPoints).toBe(4000);
    });

    it('rejects initialization from regular non-leader members', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers/ownership/initialize`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          distributions: [
            { userId: seller.user.id, basisPoints: 10000 },
          ],
        });

      expect(res.status).toBe(403);
    });

    it('rejects allocations where total basis points exceed 10000', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers/ownership/initialize`)
        .set('Authorization', `Bearer ${leader.token}`)
        .send({
          distributions: [
            { userId: leader.user.id, basisPoints: 6000 },
            { userId: seller.user.id, basisPoints: 5000 }, // 11000 total > 10000
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXCEEDS_MAX_EQUITY');
    });
  });

  describe('Full Transfer Flow: Propose → Accept → Approve', () => {
    beforeEach(async () => {
      // Allocate 5000 bps to seller, 5000 bps to leader
      await OwnershipRecord.insertMany([
        {
          group: testGroup._id,
          user: seller.user.id,
          ownershipBasisPoints: 5000,
          status: 'finalized',
        },
        {
          group: testGroup._id,
          user: leader.user.id,
          ownershipBasisPoints: 5000,
          status: 'finalized',
        },
      ]);
    });

    it('allows a seller to propose a transfer to buyer, and buyer accepts, leader approves', async () => {
      // 1. Seller proposes transferring 2000 bps (20%) to buyer for ₹20,000 (2000000 paise)
      const proposeRes = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          toUserId: buyer.user.id,
          basisPoints: 2000,
          proposedPricePaise: 2000000,
          note: 'Selling 20% share before moving city',
        });

      expect(proposeRes.status).toBe(201);
      expect(proposeRes.body.success).toBe(true);
      const transferId = proposeRes.body.data._id;
      expect(proposeRes.body.data.status).toBe('awaiting_buyer');

      // Check notification sent to buyer
      const buyerNotifs = await Notification.find({ recipient: buyer.user.id });
      expect(buyerNotifs).toHaveLength(1);
      expect(buyerNotifs[0].type).toBe('ownership_transfer_request');

      // 2. Buyer accepts the proposal
      const acceptRes = await request(app)
        .patch(`/api/groups/${testGroup._id}/transfers/${transferId}/accept`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ note: 'Accepted, funds prepared' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.status).toBe('awaiting_approval');

      // 3. Leader approves the transfer
      const approveRes = await request(app)
        .patch(`/api/groups/${testGroup._id}/transfers/${transferId}/approve`)
        .set('Authorization', `Bearer ${leader.token}`)
        .send({ note: 'Transfer verified and approved by group admin' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('completed');
      expect(approveRes.body.data.completedAt).toBeDefined();

      // 4. Verify balances updated in OwnershipRecord
      const sellerRecord = await OwnershipRecord.findOne({ group: testGroup._id, user: seller.user.id });
      const buyerRecord = await OwnershipRecord.findOne({ group: testGroup._id, user: buyer.user.id });

      expect(sellerRecord.ownershipBasisPoints).toBe(3000); // 5000 - 2000
      expect(buyerRecord.ownershipBasisPoints).toBe(2000);  // 0 + 2000
      expect(sellerRecord.ownershipBasisPoints + buyerRecord.ownershipBasisPoints + 5000).toBe(10000);
    });

    it('prevents seller from transferring more equity than they hold', async () => {
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          toUserId: buyer.user.id,
          basisPoints: 6000, // holds 5000
          proposedPricePaise: 5000000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_EQUITY');
    });

    it('prevents double-spending equity when transfers are pending', async () => {
      // First transfer: 3000 bps
      await request(app)
        .post(`/api/groups/${testGroup._id}/transfers`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          toUserId: buyer.user.id,
          basisPoints: 3000,
        });

      // Second transfer trying 3000 bps (only 2000 unlocked left)
      const res = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          toUserId: buyer.user.id,
          basisPoints: 3000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EQUITY_LOCKED');
    });

    it('allows a buyer to reject a transfer proposal', async () => {
      const proposeRes = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          toUserId: buyer.user.id,
          basisPoints: 1000,
        });

      const transferId = proposeRes.body.data._id;

      const rejectRes = await request(app)
        .patch(`/api/groups/${testGroup._id}/transfers/${transferId}/reject`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({ note: 'Not interested at this time' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.data.status).toBe('rejected');
    });

    it('allows a seller to cancel their own proposed transfer', async () => {
      const proposeRes = await request(app)
        .post(`/api/groups/${testGroup._id}/transfers`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          toUserId: buyer.user.id,
          basisPoints: 1000,
        });

      const transferId = proposeRes.body.data._id;

      const cancelRes = await request(app)
        .patch(`/api/groups/${testGroup._id}/transfers/${transferId}/cancel`)
        .set('Authorization', `Bearer ${seller.token}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');
    });
  });
});

