'use strict';

/**
 * MongoDB connection and transaction manager.
 * Detects standalone vs replica set topologies and configures transactions accordingly.
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/groupbuy';

let isConnected = false;
let transactionsSupported = false;

/**
 * Check if the current MongoDB cluster supports multi-document transactions.
 */
function checkTransactionSupport() {
  try {
    const topology = mongoose.connection.client?.topology?.description;
    const type = topology?.type;
    // Transactions require ReplicaSetWithPrimary or Sharded cluster
    if (type === 'ReplicaSetWithPrimary' || type === 'Sharded') {
      return true;
    }
    // Also check setName if available
    if (topology?.setName) {
      return true;
    }
  } catch {
    // Fallback check
  }
  return false;
}

/**
 * Connect to MongoDB with rich diagnostics and error handling.
 */
async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    isConnected = true;
    const host = mongoose.connection.host || 'unknown-host';
    const port = mongoose.connection.port || '27017';
    const dbName = mongoose.connection.name || 'groupbuy';

    console.log(`[DB] Successfully connected to MongoDB: ${host}:${port}/${dbName}`);

    // Detect replica set support for transactions
    transactionsSupported = checkTransactionSupport();

    if (transactionsSupported) {
      console.log('[DB] Multi-document ACID transactions are SUPPORTED on this cluster.');
    } else {
      console.warn('[DB WARNING] Standalone MongoDB detected. Multi-document transactions require a replica set.');
      console.warn('[DB SETUP GUIDE] To enable transactions for local development:');
      console.warn('  1. Start mongod with replica set flag: mongod --replSet rs0 --dbpath <data_dir>');
      console.warn('  2. Open mongosh and initialize: rs.initiate()');
      console.warn('  3. In-memory fallback will handle single-doc atomicity in development.');
    }

    return mongoose.connection;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.warn(`\n[DB] Configured MongoDB unreachable (${err.message}).`);
      console.log('[DB] 🚀 Automatically starting embedded in-memory MongoDB for local development...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memUri = mongod.getUri();
        await mongoose.connect(memUri);
        isConnected = true;
        transactionsSupported = false;
        console.log(`[DB] ✅ Connected to Development In-Memory MongoDB at ${memUri}`);

        try {
          const { seedDirect } = require('../scripts/seed');
          await seedDirect();
          console.log('[DB] ✅ Seeded in-memory database with demo users, syndicates & assets!\n');
        } catch (seedErr) {
          console.warn('[DB] Auto-seed warning:', seedErr.message);
        }

        return mongoose.connection;
      } catch (memErr) {
        console.error('[DB] Failed to initialize in-memory fallback:', memErr.message);
      }
    }

    isConnected = false;
    transactionsSupported = false;

    console.error('\n================================================================================');
    console.error(`[DB ERROR] Failed to connect to MongoDB!`);
    console.error(`Target URI:    ${MONGO_URI}`);
    console.error(`Error details: ${err.message}`);
    console.error('--------------------------------------------------------------------------------');
    console.error('Troubleshooting steps:');
    console.error('  1. Check if MongoDB service is running locally:');
    console.error('     - Windows: Open Services app -> Start "MongoDB Server", or run `mongod`');
    console.error('     - Docker: `docker run -d -p 27017:27017 --name mongo mongo:latest`');
    console.error('  2. Check MONGO_URI in your .env file.');
    console.error('  3. Automated tests will use mongodb-memory-server automatically.');
    console.error('================================================================================\n');

    if (process.env.NODE_ENV === 'test') {
      throw err;
    }
    if (process.env.VERCEL) {
      console.error('[DB Vercel Error] MongoDB connection failed:', err.message);
      return null;
    }
    process.exit(1);
  }
}

/**
 * Execute an operation inside a MongoDB transaction if supported, or direct fallback if standalone.
 * @param {Function} operation - async function(session)
 * @returns {Promise<any>}
 */
async function withTransaction(operation) {
  if (!transactionsSupported) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[DB] Executing operation without transaction (standalone mode fallback).');
    }
    return operation(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Disconnect from MongoDB cleanly.
 */
async function disconnectDB() {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    transactionsSupported = false;
    console.log('[DB] MongoDB disconnected cleanly.');
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function supportsTransactions() {
  return transactionsSupported;
}

module.exports = {
  connectDB,
  disconnectDB,
  withTransaction,
  isDbConnected,
  supportsTransactions,
};
