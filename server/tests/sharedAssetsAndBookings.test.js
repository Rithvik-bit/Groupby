'use strict';
/**
 * Phase 4 Test Suite: Shared Assets, Booking & Reservation Concurrency
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let User;
let Group;
let GroupMembership;
let SharedAsset;
let Booking;
let Notification;
let AuditLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  User = require('../src/models/User');
  Group = require('../src/models/Group');
  GroupMembership = require('../src/models/GroupMembership');
  SharedAsset = require('../src/models/SharedAsset');
  Booking = require('../src/models/Booking');
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

// Helper: setup group with owner and member
async function setupGroupAndUsers() {
  const owner = await createUser('owner@assettest.com', 'ownerasset');
  const member = await createUser('member@assettest.com', 'memberasset');
  const outsider = await createUser('outsider@assettest.com', 'outsiderasset');

  // Owner creates group
  const groupRes = await request(app)
    .post('/api/groups')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({
      title: 'Community Tool Shed',
      description: 'Shared tools and workshop equipment',
      groupType: 'shared_equipment',
      category: 'workshop',
      visibility: 'public',
      maxMembers: 10,
    });
  const groupId = groupRes.body.data._id;

  // Member joins group
  const joinRes = await request(app)
    .post(`/api/groups/${groupId}/join`)
    .set('Authorization', `Bearer ${member.token}`);
  await request(app)
    .patch(`/api/groups/${groupId}/requests/${joinRes.body.data._id}`)
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ decision: 'approve' });

  return { owner, member, outsider, groupId };
}

describe('Phase 4: Shared Asset Management & Authorization', () => {
  test('Group owner can create, edit, view, and archive a shared asset', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    // 1. Create Asset
    const createRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'DeWalt Table Saw DWE7491RS',
        description: '10-inch jobsite table saw with rolling stand',
        category: 'workshop',
        locationDescription: 'Workshop Bay 3, Shelf B',
        condition: 'excellent',
        minBookingDurationHours: 2,
        maxBookingDurationHours: 24,
        advanceBookingDays: 14,
        requiresApproval: false,
        usageInstructions: 'Safety goggles and push stick required at all times.',
        cancellationPolicy: 'Cancel at least 1 hour before reservation start.',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe('DeWalt Table Saw DWE7491RS');
    const assetId = createRes.body.data._id;

    // 2. Member can view asset details
    const viewRes = await request(app)
      .get(`/api/groups/${groupId}/assets/${assetId}`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.data.locationDescription).toBe('Workshop Bay 3, Shelf B');

    // 3. Edit Asset (Owner only)
    const updateRes = await request(app)
      .patch(`/api/groups/${groupId}/assets/${assetId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ condition: 'good', conditionNotes: 'Blade replaced recently.' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.condition).toBe('good');

    // 4. Regular member cannot edit asset (403)
    const hackRes = await request(app)
      .patch(`/api/groups/${groupId}/assets/${assetId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: 'Hacked Tool Name' });
    expect(hackRes.status).toBe(403);

    // 5. Archive Asset
    const archiveRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/archive`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(archiveRes.status).toBe(200);

    // Archived asset is not returned in active list
    const listRes = await request(app)
      .get(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(listRes.body.data.find((a) => a._id === assetId)).toBeUndefined();
  });

  test('Cross-group IDOR protection: cannot access asset via incorrect group ID', async () => {
    const { owner, groupId } = await setupGroupAndUsers();

    // Create another group
    const g2Res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        title: 'Another Group',
        description: 'Second group',
        groupType: 'shared_equipment',
        category: 'electronics',
      });
    const group2Id = g2Res.body.data._id;

    // Create asset in Group 1
    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Group 1 Laser Cutter', category: 'workshop' });
    const assetId = assetRes.body.data._id;

    // Attempt to access Group 1 asset through Group 2 URL (must return 404)
    const idorRes = await request(app)
      .get(`/api/groups/${group2Id}/assets/${assetId}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(idorRes.status).toBe(404);
  });
});

describe('Phase 4: Concurrency-Safe Reservations & Overlap Prevention', () => {
  test('Simultaneous competing booking requests: exactly one succeeds, one conflicts', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    // Create asset without approval required
    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'CNC Milling Machine',
        category: 'workshop',
        minBookingDurationHours: 1,
        maxBookingDurationHours: 12,
        requiresApproval: false,
      });
    const assetId = assetRes.body.data._id;

    const baseTime = Date.now() + 24 * 3600 * 1000; // Tomorrow
    const startTime = new Date(baseTime).toISOString();
    const endTime = new Date(baseTime + 3 * 3600 * 1000).toISOString(); // 3 hours

    // Send competing requests concurrently using Promise.all
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ startTime, endTime, purpose: 'Owner CNC Project' }),
      request(app)
        .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
        .set('Authorization', `Bearer ${member.token}`)
        .send({ startTime, endTime, purpose: 'Member CNC Project' }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one must succeed (201) and the other must conflict (409)
    expect(statuses).toEqual([201, 409]);

    const successfulRes = res1.status === 201 ? res1 : res2;
    const conflictRes = res1.status === 409 ? res1 : res2;

    expect(conflictRes.body.error.code).toBe('BOOKING_CONFLICT');
    expect(successfulRes.body.data.status).toBe('confirmed');

    // Verify in database: exactly ONE booking was saved for that asset
    const totalBookings = await Booking.countDocuments({ asset: assetId, status: 'confirmed' });
    expect(totalBookings).toBe(1);

    // Verify activeReservations on asset has exactly one entry
    const assetDoc = await SharedAsset.findById(assetId);
    expect(assetDoc.activeReservations.length).toBe(1);
  });

  test('Adjacent bookings succeed using half-open interval [startTime, endTime)', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: '3D Printer Ultimaker', category: 'printing', maxBookingDurationHours: 10 });
    const assetId = assetRes.body.data._id;

    const base = Date.now() + 48 * 3600 * 1000;
    const slot1Start = new Date(base).toISOString();
    const slot1End = new Date(base + 2 * 3600 * 1000).toISOString(); // [T, T+2h)

    const slot2Start = slot1End; // Starts exactly when Slot 1 ends! [T+2h, T+4h)
    const slot2End = new Date(base + 4 * 3600 * 1000).toISOString();

    // Booking 1: Owner books Slot 1
    const b1 = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ startTime: slot1Start, endTime: slot1End, purpose: 'Print 1' });
    expect(b1.status).toBe(201);

    // Booking 2: Member books Slot 2 (adjacent, non-overlapping)
    const b2 = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ startTime: slot2Start, endTime: slot2End, purpose: 'Print 2' });
    expect(b2.status).toBe(201);

    // Both bookings succeeded
    expect(b1.body.success).toBe(true);
    expect(b2.body.success).toBe(true);

    const count = await Booking.countDocuments({ asset: assetId, status: 'confirmed' });
    expect(count).toBe(2);
  });

  test('Overlapping booking request conflicts and is rejected', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Oscilloscope 100MHz', category: 'electronics' });
    const assetId = assetRes.body.data._id;

    const base = Date.now() + 72 * 3600 * 1000;
    // Slot: [10:00, 14:00)
    await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        startTime: new Date(base).toISOString(),
        endTime: new Date(base + 4 * 3600 * 1000).toISOString(),
        purpose: 'Circuit Testing',
      });

    // Overlapping slot: [12:00, 16:00) (overlaps by 2 hours)
    const overlapRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        startTime: new Date(base + 2 * 3600 * 1000).toISOString(),
        endTime: new Date(base + 6 * 3600 * 1000).toISOString(),
        purpose: 'Overlap Test',
      });

    expect(overlapRes.status).toBe(409);
    expect(overlapRes.body.error.code).toBe('BOOKING_CONFLICT');
  });

  test('Simultaneous requests for DIFFERENT assets both succeed', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    const [a1Res, a2Res] = await Promise.all([
      request(app).post(`/api/groups/${groupId}/assets`).set('Authorization', `Bearer ${owner.token}`).send({ name: 'Asset Alpha', category: 'workshop' }),
      request(app).post(`/api/groups/${groupId}/assets`).set('Authorization', `Bearer ${owner.token}`).send({ name: 'Asset Beta', category: 'workshop' }),
    ]);

    const base = Date.now() + 24 * 3600 * 1000;
    const startTime = new Date(base).toISOString();
    const endTime = new Date(base + 2 * 3600 * 1000).toISOString();

    const [b1, b2] = await Promise.all([
      request(app).post(`/api/groups/${groupId}/assets/${a1Res.body.data._id}/bookings`).set('Authorization', `Bearer ${owner.token}`).send({ startTime, endTime }),
      request(app).post(`/api/groups/${groupId}/assets/${a2Res.body.data._id}/bookings`).set('Authorization', `Bearer ${member.token}`).send({ startTime, endTime }),
    ]);

    expect(b1.status).toBe(201);
    expect(b2.status).toBe(201);
  });
});

describe('Phase 4: Cancellation, Maintenance & Availability Calendar', () => {
  test('Cancellation releases the reserved slot immediately', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Angle Grinder', category: 'workshop' });
    const assetId = assetRes.body.data._id;

    const base = Date.now() + 36 * 3600 * 1000;
    const startTime = new Date(base).toISOString();
    const endTime = new Date(base + 2 * 3600 * 1000).toISOString();

    // 1. Owner books slot
    const bookRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ startTime, endTime, purpose: 'Grinding metal' });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.data._id;

    // 2. Member tries to book same slot -> conflicts (409)
    const conflictRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ startTime, endTime });
    expect(conflictRes.status).toBe(409);

    // 3. Owner cancels booking
    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ reason: 'Plans changed' });
    expect(cancelRes.status).toBe(200);

    // 4. Member now books the freed slot -> SUCCEEDS!
    const rebookRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ startTime, endTime, purpose: 'Now available' });
    expect(rebookRes.status).toBe(201);
  });

  test('Maintenance blocks prevent bookings during scheduled downtime', async () => {
    const { owner, member, groupId } = await setupGroupAndUsers();

    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Hydraulic Press', category: 'workshop' });
    const assetId = assetRes.body.data._id;

    const base = Date.now() + 50 * 3600 * 1000;
    const maintStart = new Date(base).toISOString();
    const maintEnd = new Date(base + 5 * 3600 * 1000).toISOString();

    // Owner schedules maintenance
    const maintRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/maintenance`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ startTime: maintStart, endTime: maintEnd, reason: 'Annual Hydraulic Inspection' });
    expect(maintRes.status).toBe(201);

    // Member attempts to book overlapping slot during maintenance
    const bookRes = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        startTime: new Date(base + 1 * 3600 * 1000).toISOString(),
        endTime: new Date(base + 3 * 3600 * 1000).toISOString(),
      });
    expect(bookRes.status).toBe(409);
    expect(bookRes.body.error.code).toBe('BOOKING_CONFLICT');

    // Availability endpoint returns maintenance block without leaking private details
    const availRes = await request(app)
      .get(`/api/groups/${groupId}/assets/${assetId}/availability`)
      .set('Authorization', `Bearer ${member.token}`);
    expect(availRes.status).toBe(200);
    const maintSlot = availRes.body.data.slots.find((s) => s.type === 'maintenance');
    expect(maintSlot).toBeTruthy();
    expect(maintSlot.reason).toBe('Annual Hydraulic Inspection');
  });

  test('Pending booking policy: holds slot and blocks competing requests while pending', async () => {
    const { owner, member, outsider, groupId } = await setupGroupAndUsers();

    // Asset requires approval
    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Heavy Excavator', category: 'workshop', requiresApproval: true });
    const assetId = assetRes.body.data._id;

    const base = Date.now() + 60 * 3600 * 1000;
    const start = new Date(base).toISOString();
    const end = new Date(base + 4 * 3600 * 1000).toISOString();

    // Member submits booking request -> pending
    const bookReq = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ startTime: start, endTime: end, purpose: 'Digging foundation' });
    expect(bookReq.status).toBe(201);
    expect(bookReq.body.data.status).toBe('pending');
    const bookingId = bookReq.body.data._id;

    // Another user tries to book the same slot while first is still pending -> blocked!
    const blockReq = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ startTime: start, endTime: end, purpose: 'Compete while pending' });
    expect(blockReq.status).toBe(409);

    // Owner approves the booking
    const approveRes = await request(app)
      .patch(`/api/groups/${groupId}/assets/bookings/${bookingId}/approval`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ decision: 'approve' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('confirmed');
  });

  test('Idempotent booking submission returns same booking on duplicate retry', async () => {
    const { owner, groupId } = await setupGroupAndUsers();

    const assetRes = await request(app)
      .post(`/api/groups/${groupId}/assets`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Pro Camera Tripod', category: 'photography' });
    const assetId = assetRes.body.data._id;

    const base = Date.now() + 80 * 3600 * 1000;
    const startTime = new Date(base).toISOString();
    const endTime = new Date(base + 2 * 3600 * 1000).toISOString();
    const idempotencyKey = 'idem-tripod-12345';

    // First request
    const res1 = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('idempotency-key', idempotencyKey)
      .send({ startTime, endTime, purpose: 'Photo shoot' });
    expect(res1.status).toBe(201);

    // Duplicate retry with same idempotency key
    const res2 = await request(app)
      .post(`/api/groups/${groupId}/assets/${assetId}/bookings`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('idempotency-key', idempotencyKey)
      .send({ startTime, endTime, purpose: 'Photo shoot' });
    expect(res2.status).toBe(200);
    expect(res2.body.idempotentRetry).toBe(true);
    expect(res2.body.data._id).toBe(res1.body.data._id);
  });
});
