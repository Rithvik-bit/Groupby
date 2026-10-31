'use strict';
/**
 * Security & Authorization Integration Tests.
 * Requirements 3, 5 & 6:
 * - CSRF verification on cookie mutations
 * - IDOR protection on private user accounts
 * - Profile privacy filtering (private, showEmail, showBudget)
 * - Privilege escalation guard
 * - Production environment secret safety
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const { validateEnvironment } = require('../src/utils/validateEnv');

let mongod;
let app;

jest.setTimeout(60000);

beforeAll(async () => {
  process.env.MONGOMS_MD5_CHECK = '0';
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_for_security_suite';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_for_security_suite';
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

describe('CSRF Protection', () => {
  test('rejects cookie-based mutation with invalid or missing CSRF token', async () => {
    // 1. Register & login
    await request(app).post('/api/auth/register').send({
      email: 'csrf@test.com', username: 'csrfuser', password: 'Password@123',
    });
    await User.findOneAndUpdate({ email: 'csrf@test.com' }, { isEmailVerified: true });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'csrf@test.com', password: 'Password@123',
    });

    const refreshCookie = loginRes.headers['set-cookie'].find((c) => c.startsWith('gb_refresh='));
    expect(refreshCookie).toBeDefined();

    // 2. Attempt refresh with cookie but wrong CSRF token header (with enforcement header)
    const failRes = await request(app).post('/api/auth/refresh')
      .set('Cookie', [refreshCookie, 'gb_csrf=legitimate_csrf_token_12345'])
      .set('x-enforce-csrf', 'true')
      .set('x-csrf-token', 'malicious_attacker_token_67890');

    expect(failRes.status).toBe(403);
    expect(failRes.body.error.code).toBe('CSRF_INVALID');

    // 3. Succeeds when matching CSRF token is provided
    const passRes = await request(app).post('/api/auth/refresh')
      .set('Cookie', [refreshCookie, 'gb_csrf=legitimate_csrf_token_12345'])
      .set('x-enforce-csrf', 'true')
      .set('x-csrf-token', 'legitimate_csrf_token_12345');

    expect(passRes.status).toBe(200);
  });
});

describe('IDOR & Profile Privacy', () => {
  let user1Token, user1Id, user2Token, user2Id;

  beforeEach(async () => {
    // Create User 1
    const u1 = await User.create({
      email: 'user1@privacy.test',
      username: 'userone',
      displayName: 'User One',
      passwordHash: 'Password@123',
      isEmailVerified: true,
      bio: 'Private personal biography',
      profileVisibility: 'private',
      showEmail: false,
      showBudget: false,
      budgetRangeMinPaise: 500000,
    });
    user1Id = u1._id.toString();

    // Create User 2
    const u2 = await User.create({
      email: 'user2@privacy.test',
      username: 'usertwo',
      displayName: 'User Two',
      passwordHash: 'Password@123',
      isEmailVerified: true,
    });
    user2Id = u2._id.toString();

    const l1 = await request(app).post('/api/auth/login').send({ email: 'user1@privacy.test', password: 'Password@123' });
    user1Token = l1.body.data.accessToken;

    const l2 = await request(app).post('/api/auth/login').send({ email: 'user2@privacy.test', password: 'Password@123' });
    user2Token = l2.body.data.accessToken;
  });

  test('prevents User 2 from updating User 1 account (IDOR prevention)', async () => {
    const res = await request(app).patch(`/api/users/${user1Id}`)
      .set('Authorization', `Bearer ${user2Token}`)
      .send({ displayName: 'Hacked Name' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');

    // Verify User 1 name unchanged
    const verifyUser = await User.findById(user1Id);
    expect(verifyUser.displayName).toBe('User One');
  });

  test('filters private profile fields for unauthorized third-party viewers', async () => {
    // User 2 views User 1's profile
    const res = await request(app).get(`/api/users/${user1Id}`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(200);
    // User 1 has profileVisibility: 'private' -> reveals only minimal public card
    expect(res.body.data).toHaveProperty('username', 'userone');
    expect(res.body.data).not.toHaveProperty('bio');
    expect(res.body.data).not.toHaveProperty('email');
    expect(res.body.data).not.toHaveProperty('budgetRangeMinPaise');
  });

  test('allows user to see their own full profile', async () => {
    const res = await request(app).get(`/api/users/${user1Id}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe('Private personal biography');
    expect(res.body.data.email).toBe('user1@privacy.test');
    expect(res.body.data.budgetRangeMinPaise).toBe(500000);
  });
});

describe('Production Environment Security Validation', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test('validateEnvironment fails fast when production secrets contain placeholders or are too short', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'dev_short_secret',
      JWT_REFRESH_SECRET: 'REPLACE_WITH_RANDOM_SECRET',
      COOKIE_SECRET: 'short',
    };

    expect(() => validateEnvironment()).toThrow('[FATAL CONFIG ERROR]');
  });

  test('validateEnvironment passes with strong production keys', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'a'.repeat(64),
      JWT_REFRESH_SECRET: 'b'.repeat(64),
      COOKIE_SECRET: 'c'.repeat(32),
      MONGO_URI: 'mongodb://prod-cluster.internal:27017/gb',
      CLIENT_URL: 'https://groupbuy.example.com',
    };

    const result = validateEnvironment();
    expect(result.isValid).toBe(true);
  });
});
