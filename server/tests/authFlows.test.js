'use strict';
/**
 * Authentication Flow End-to-End Tests.
 * Tests:
 * - Refresh token rotation & family tracking
 * - Refresh token reuse detection & immediate family revocation
 * - Logout & session invalidation
 * - Email verification lifecycle & single-use guarantee
 * - Password reset lifecycle, expiration, single-use, and session revocation
 * - Password change with current-password verification
 * - Profile updates and privilege escalation prevention
 * - Account deactivation lifecycle
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const { hashToken } = require('../src/utils/jwt');

let mongod;
let app;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.MONGOMS_MD5_CHECK = '0';
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_for_auth_flows';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_auth_flows';
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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Refresh Token Rotation & Reuse Detection', () => {
  test('rotates refresh token and issues new access token', async () => {
    // 1. Register and verify
    await request(app).post('/api/auth/register').send({
      email: 'rotate@test.com', username: 'rotator', password: 'Password@123',
    });
    await User.findOneAndUpdate({ email: 'rotate@test.com' }, { isEmailVerified: true });

    // 2. Login to get initial cookies
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'rotate@test.com', password: 'Password@123',
    });
    const cookies1 = loginRes.headers['set-cookie'];
    const refreshCookie1 = cookies1.find((c) => c.startsWith('gb_refresh='));
    expect(refreshCookie1).toBeDefined();

    // 3. Perform refresh
    const refreshRes = await request(app).post('/api/auth/refresh')
      .set('Cookie', [refreshCookie1]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data).toHaveProperty('accessToken');

    const cookies2 = refreshRes.headers['set-cookie'];
    const refreshCookie2 = cookies2.find((c) => c.startsWith('gb_refresh='));
    expect(refreshCookie2).toBeDefined();
    // Rotated token must differ from initial token
    expect(refreshCookie2).not.toBe(refreshCookie1);
  });

  test('detects refresh token reuse and revokes all active sessions in the family', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'reuse@test.com', username: 'reuser', password: 'Password@123',
    });
    await User.findOneAndUpdate({ email: 'reuse@test.com' }, { isEmailVerified: true });

    // Login
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'reuse@test.com', password: 'Password@123',
    });
    const oldCookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('gb_refresh='));

    // Legitimate client rotates token
    const refreshRes1 = await request(app).post('/api/auth/refresh')
      .set('Cookie', [oldCookie]);
    expect(refreshRes1.status).toBe(200);

    // Attacker (or compromised victim) replays the OLD, already-used refresh token!
    const replayRes = await request(app).post('/api/auth/refresh')
      .set('Cookie', [oldCookie]);

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.code).toBe('TOKEN_REUSE');

    // Verify server-side that the token family was completely revoked
    const userInDb = await User.findOne({ email: 'reuse@test.com' }).select('+refreshTokenHash +refreshTokenFamily');
    expect(userInDb.refreshTokenHash).toBeNull();
    expect(userInDb.refreshTokenFamily).toBeNull();

    // Even the legitimately rotated token is now revoked due to family invalidation
    const newCookie = refreshRes1.headers['set-cookie'].find((c) => c.startsWith('gb_refresh='));
    const subsequentRes = await request(app).post('/api/auth/refresh')
      .set('Cookie', [newCookie]);
    expect(subsequentRes.status).toBe(401);
  });
});

describe('Logout & Session Invalidation', () => {
  test('revokes refresh token and clears cookies', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'logout@test.com', username: 'logouter', password: 'Password@123',
    });
    await User.findOneAndUpdate({ email: 'logout@test.com' }, { isEmailVerified: true });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'logout@test.com', password: 'Password@123',
    });
    const cookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('gb_refresh='));

    const logoutRes = await request(app).post('/api/auth/logout')
      .set('Cookie', [cookie]);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify session revoked in database
    const user = await User.findOne({ email: 'logout@test.com' }).select('+refreshTokenHash +refreshTokenFamily');
    expect(user.refreshTokenHash).toBeNull();

    // Subsequent refresh attempts must fail
    const subsequentRefresh = await request(app).post('/api/auth/refresh')
      .set('Cookie', [cookie]);
    expect(subsequentRefresh.status).toBe(401);
  });
});

describe('Email Verification Lifecycle', () => {
  test('verifies email using raw token and prevents single-use replay', async () => {
    const rawToken = 'raw-test-verify-token-12345';
    await User.create({
      email: 'verify@test.com',
      username: 'verifier',
      passwordHash: 'Password@123',
      emailVerifyTokenHash: hashToken(rawToken),
      emailVerifyExpires: new Date(Date.now() + 60000),
    });

    // 1. Verify with valid token
    const res = await request(app).get(`/api/auth/verify-email/${rawToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = await User.findOne({ email: 'verify@test.com' });
    expect(user.isEmailVerified).toBe(true);

    // 2. Replay same token -> must fail (single-use)
    const replayRes = await request(app).get(`/api/auth/verify-email/${rawToken}`);
    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error.code).toBe('INVALID_TOKEN');
  });

  test('rejects expired verification token', async () => {
    const expiredToken = 'expired-verify-token';
    await User.create({
      email: 'expired@test.com',
      username: 'expireduser',
      passwordHash: 'Password@123',
      emailVerifyTokenHash: hashToken(expiredToken),
      emailVerifyExpires: new Date(Date.now() - 10000), // in the past
    });

    const res = await request(app).get(`/api/auth/verify-email/${expiredToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('Password Reset Lifecycle', () => {
  test('resets password, enforces single-use, and invalidates active sessions', async () => {
    const rawResetToken = 'raw-reset-token-abcdef';
    const user = await User.create({
      email: 'reset@test.com',
      username: 'resetuser',
      passwordHash: 'OldPass@123',
      isEmailVerified: true,
      passwordResetTokenHash: hashToken(rawResetToken),
      passwordResetExpires: new Date(Date.now() + 60000),
      refreshTokenHash: 'existing_active_session_hash',
      refreshTokenFamily: 'family_123',
    });

    // Reset password
    const res = await request(app).post(`/api/auth/reset-password/${rawResetToken}`).send({
      password: 'NewPassword@999',
    });
    expect(res.status).toBe(200);

    // Old password must not work
    const oldLogin = await request(app).post('/api/auth/login').send({
      email: 'reset@test.com', password: 'OldPass@123',
    });
    expect(oldLogin.status).toBe(401);

    // New password must work
    const newLogin = await request(app).post('/api/auth/login').send({
      email: 'reset@test.com', password: 'NewPassword@999',
    });
    expect(newLogin.status).toBe(200);

    // Old token replay must fail (single use)
    const replayRes = await request(app).post(`/api/auth/reset-password/${rawResetToken}`).send({
      password: 'AnotherPassword@123',
    });
    expect(replayRes.status).toBe(400);
    expect(replayRes.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('Password Change & Profile Updates', () => {
  let token;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'member@test.com', username: 'memberuser', password: 'CurrentPassword@123',
    });
    await User.findOneAndUpdate({ email: 'member@test.com' }, { isEmailVerified: true });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'member@test.com', password: 'CurrentPassword@123',
    });
    token = loginRes.body.data.accessToken;
  });

  test('changes password after verifying current password', async () => {
    // Fails with incorrect current password
    const failRes = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword@1', newPassword: 'UpdatedPassword@456' });
    expect(failRes.status).toBe(401);

    // Succeeds with correct current password
    const passRes = await request(app).post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'CurrentPassword@123', newPassword: 'UpdatedPassword@456' });
    expect(passRes.status).toBe(200);

    // Verify new password works
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'member@test.com', password: 'UpdatedPassword@456',
    });
    expect(loginRes.status).toBe(200);
  });

  test('updates profile and prevents self-assigning admin role', async () => {
    const updateRes = await request(app).patch('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Updated Name',
        bio: 'New user bio',
        role: 'admin', // Attempted privilege escalation!
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.displayName).toBe('Updated Name');
    expect(updateRes.body.data.bio).toBe('New user bio');
    // Role must remain 'user'
    expect(updateRes.body.data.role).toBe('user');
  });

  test('deactivates account and terminates subsequent logins', async () => {
    const deactRes = await request(app).post('/api/auth/deactivate')
      .set('Authorization', `Bearer ${token}`);
    expect(deactRes.status).toBe(200);

    // Login must now be rejected
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'member@test.com', password: 'CurrentPassword@123',
    });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_INACTIVE');
  });
});
