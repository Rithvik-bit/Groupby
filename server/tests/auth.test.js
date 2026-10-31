'use strict';
/**
 * Auth & authorization tests
 * Tests: register, login, protected route access, private data isolation.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;

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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('POST /api/auth/register', () => {
  test('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com', username: 'testuser',
      password: 'Test@12345', displayName: 'Test User',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dup@example.com', username: 'dupuser1', password: 'Test@12345',
    });
    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@example.com', username: 'dupuser2', password: 'Test@12345',
    });
    expect(res.status).toBe(409);
  });

  test('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'weak@example.com', username: 'weakuser', password: '123',
    });
    expect(res.status).toBe(400);
  });

  test('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email', username: 'baduser', password: 'Test@12345',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@example.com', username: 'loginuser', password: 'Test@12345',
    });
    // Manually verify email for login test
    const User = require('../src/models/User');
    await User.findOneAndUpdate({ email: 'login@example.com' }, { isEmailVerified: true });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'Test@12345',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    // Refresh token must be in HttpOnly cookie, NOT JSON body
    expect(res.body.data).not.toHaveProperty('refreshToken');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'WrongPass@1',
    });
    expect(res.status).toBe(401);
  });

  test('does not expose which field was wrong (timing attack)', async () => {
    const res1 = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com', password: 'Test@12345',
    });
    const res2 = await request(app).post('/api/auth/login').send({
      email: 'login@example.com', password: 'WrongPass@1',
    });
    // Both should return same generic message
    expect(res1.body.error.message).toBe(res2.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'me@example.com', username: 'meuser', password: 'Test@12345',
    });
    const User = require('../src/models/User');
    await User.findOneAndUpdate({ email: 'me@example.com' }, { isEmailVerified: true });
    const res = await request(app).post('/api/auth/login').send({
      email: 'me@example.com', password: 'Test@12345',
    });
    token = res.body.data.accessToken;
  });

  test('returns current user without sensitive fields', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data).not.toHaveProperty('refreshTokenHash');
    expect(res.body.data).not.toHaveProperty('emailVerifyToken');
    expect(res.body.data).not.toHaveProperty('passwordResetToken');
  });

  test('rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects invalid token', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.status).toBe(401);
  });
});
