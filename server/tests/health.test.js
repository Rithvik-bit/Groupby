'use strict';
/**
 * Health endpoint integration test.
 * Verifies that the /health endpoint correctly reports service and database connectivity.
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
  process.env.NODE_ENV = 'test';
  await mongoose.connect(process.env.MONGO_URI);
  const { app: a } = require('../src/app');
  app = a;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('GET /health', () => {
  test('returns 200 OK with database connection status and server info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body.environment).toBe('test');
    expect(res.body.database).toBeDefined();
    expect(res.body.database.connected).toBe(true);
  });
});
