'use strict';
/**
 * Model Integrity & Schema Validation Tests.
 * Requirements 2, 4, 6 & 8:
 * - Integer paise precision
 * - Basis points constraints (1 to 10,000)
 * - Append-only immutability hooks on AuditLog & Contribution
 * - Booking chronological validation (endTime > startTime)
 * - Unique constraints on memberships and users
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../src/models/User');
const Group = require('../src/models/Group');
const GroupMembership = require('../src/models/GroupMembership');
const Product = require('../src/models/Product');
const Contribution = require('../src/models/Contribution');
const OwnershipRecord = require('../src/models/OwnershipRecord');
const OwnershipTransfer = require('../src/models/OwnershipTransfer');
const Booking = require('../src/models/Booking');
const AuditLog = require('../src/models/AuditLog');

let mongod;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.MONGOMS_MD5_CHECK = '0';
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Financial & Basis Points Validation', () => {
  test('Group requires valid paise amounts and rejects negative values', async () => {
    const user = await User.create({ email: 'owner@test.com', username: 'owneruser', passwordHash: 'pass' });

    const invalidGroup = new Group({
      title: 'Invalid Group',
      description: 'Desc',
      groupType: 'collective_purchase',
      category: 'electronics',
      createdBy: user._id,
      targetAmountPaise: -500, // Negative amount invalid
    });

    await expect(invalidGroup.validate()).rejects.toThrow();
  });

  test('OwnershipRecord validates basis points between 1 and 10000', async () => {
    const user = await User.create({ email: 'owner2@test.com', username: 'owneruser2', passwordHash: 'pass' });
    const group = await Group.create({
      title: 'G', description: 'D', groupType: 'collective_purchase', category: 'other', createdBy: user._id,
    });
    const product = await Product.create({ group: group._id, name: 'P', pricePaise: 10000 });

    // Below 1 basis point
    const recordZero = new OwnershipRecord({
      group: group._id, product: product._id, user: user._id, ownershipBasisPoints: 0,
    });
    await expect(recordZero.validate()).rejects.toThrow();

    // Above 10000 basis points
    const recordExcess = new OwnershipRecord({
      group: group._id, product: product._id, user: user._id, ownershipBasisPoints: 10001,
    });
    await expect(recordExcess.validate()).rejects.toThrow();

    // Exactly 10000 basis points is valid
    const recordValid = new OwnershipRecord({
      group: group._id, product: product._id, user: user._id, ownershipBasisPoints: 10000,
    });
    await expect(recordValid.validate()).resolves.toBeUndefined();
  });
});

describe('Booking Chronological Validation', () => {
  test('Booking enforces endTime after startTime', async () => {
    const user = await User.create({ email: 'booker@test.com', username: 'bookeruser', passwordHash: 'pass' });
    const group = await Group.create({
      title: 'GBook', description: 'D', groupType: 'shared_equipment', category: 'workshop', createdBy: user._id,
    });
    const assetId = new mongoose.Types.ObjectId();

    const now = new Date();
    const earlier = new Date(now.getTime() - 3600000);

    const invalidBooking = new Booking({
      group: group._id,
      asset: assetId,
      bookedBy: user._id,
      startTime: now,
      endTime: earlier, // earlier than startTime!
    });

    await expect(invalidBooking.validate()).rejects.toThrow('endTime must be after startTime');
  });
});

describe('Immutability Hooks', () => {
  test('AuditLog collection prevents updates and deletions', async () => {
    const entry = await AuditLog.create({
      action: 'test.action',
      entityType: 'user',
      entityId: new mongoose.Types.ObjectId(),
    });

    // Attempt update
    await expect(AuditLog.updateOne({ _id: entry._id }, { action: 'hacked.action' }))
      .rejects.toThrow('AuditLog is immutable');

    // Attempt delete
    await expect(AuditLog.deleteOne({ _id: entry._id }))
      .rejects.toThrow('AuditLog is immutable');
  });

  test('Contribution collection prevents in-place updates (append-only ledger)', async () => {
    const user = await User.create({ email: 'contrib@test.com', username: 'contribuser', passwordHash: 'pass' });
    const group = await Group.create({
      title: 'GC', description: 'D', groupType: 'collective_purchase', category: 'services', createdBy: user._id,
    });

    const contrib = await Contribution.create({
      group: group._id,
      user: user._id,
      amountPaise: 50000,
      type: 'contribution',
      idempotencyKey: 'key-12345',
    });

    await expect(Contribution.updateOne({ _id: contrib._id }, { amountPaise: 99999 }))
      .rejects.toThrow('Contribution records are append-only');
  });
});

describe('Group Membership Constraints', () => {
  test('enforces unique compound index on group and user', async () => {
    const user = await User.create({ email: 'member@test.com', username: 'memberuser', passwordHash: 'pass' });
    const group = await Group.create({
      title: 'GM', description: 'D', groupType: 'collective_purchase', category: 'vehicles', createdBy: user._id,
    });

    await GroupMembership.create({ group: group._id, user: user._id, role: 'member' });

    // Attempt duplicate membership for same user in same group
    await expect(
      GroupMembership.create({ group: group._id, user: user._id, role: 'member' })
    ).rejects.toThrow();
  });
});
