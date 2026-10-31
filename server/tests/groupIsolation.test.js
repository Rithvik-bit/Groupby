'use strict';
/**
 * Group isolation and private data protection tests.
 * Proves that one user cannot access another user's private group data.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod, app;
let token1, token2, groupId, privateGroupId;

async function registerAndLogin(email, username) {
  await request(app).post('/api/auth/register').send({ email, username, password: 'Test@12345' });
  const User = require('../src/models/User');
  await User.findOneAndUpdate({ email }, { isEmailVerified: true });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Test@12345' });
  return res.body.data.accessToken;
}

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.MONGOMS_MD5_CHECK = '0';
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_PROVIDER = 'console';
  await mongoose.connect(process.env.MONGO_URI);
  const { app: a } = require('../src/app');
  app = a;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});

  token1 = await registerAndLogin('user1@test.com', 'user1test');
  token2 = await registerAndLogin('user2@test.com', 'user2test');

  // User1 creates a public group
  const g1 = await request(app).post('/api/groups')
    .set('Authorization', `Bearer ${token1}`)
    .send({ title: 'Public Group', description: 'A public group', groupType: 'collective_purchase', category: 'electronics' });
  groupId = g1.body.data._id;

  // User1 creates a private group
  const g2 = await request(app).post('/api/groups')
    .set('Authorization', `Bearer ${token1}`)
    .send({ title: 'Private Group', description: 'Secret group', groupType: 'shared_equipment', category: 'electronics', visibility: 'private' });
  privateGroupId = g2.body.data._id;
});

describe('Group isolation', () => {
  test('non-member cannot see private group details', async () => {
    const res = await request(app).get(`/api/groups/${privateGroupId}`)
      .set('Authorization', `Bearer ${token2}`);
    // Must return 404 — not 403 — to avoid revealing the group exists
    expect(res.status).toBe(404);
  });

  test('unauthenticated user cannot see private group', async () => {
    const res = await request(app).get(`/api/groups/${privateGroupId}`);
    expect(res.status).toBe(404);
  });

  test('non-member cannot read member list', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });

  test('non-member cannot read group chat', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/chat`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });

  test('non-member cannot read contribution history', async () => {
    const res = await request(app).get(`/api/groups/${groupId}/contributions`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });

  test('non-member cannot make contribution', async () => {
    const res = await request(app).post(`/api/groups/${groupId}/contributions`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ amountPaise: 100000 });
    expect(res.status).toBe(403);
  });

  test('non-admin can see public group details without inviteCode', async () => {
    const res = await request(app).get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(200);
    // Invite code must NOT be in public response for non-admin
    expect(res.body.data).not.toHaveProperty('inviteCode');
  });

  test('contribution history does not expose other users financial records', async () => {
    // User1 contributes
    await request(app).post(`/api/groups/${groupId}/contributions`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ amountPaise: 50000, idempotencyKey: 'test-iso-key' });

    // User2 joins first
    await request(app).post(`/api/groups/${groupId}/join`)
      .set('Authorization', `Bearer ${token2}`);

    // Approve user2 (user1 is admin)
    const GroupMembership = require('../src/models/GroupMembership');
    const m = await GroupMembership.findOne({ group: groupId, user: { $exists: true }, status: 'pending' });
    if (m) await GroupMembership.findByIdAndUpdate(m._id, { status: 'active', role: 'member', joinedAt: new Date() });

    const res = await request(app).get(`/api/groups/${groupId}/contributions`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(200);
    // User2 should only see their own contributions (none), not user1's
    const contribs = res.body.data;
    contribs.forEach((c) => {
      expect(c.user._id || c.user).toBe(res.body.data.length === 0 ? undefined : expect.anything());
    });
    // User2 has no contributions so list must be empty
    expect(contribs.length).toBe(0);
  });
});
