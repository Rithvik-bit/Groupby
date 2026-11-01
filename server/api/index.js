'use strict';
/**
 * Vercel Serverless Function entry point.
 * Wraps the Express application and manages database connection pooling.
 */
const app = require('../src/app');
const { connectDB, isDbConnected } = require('../src/config/db');

module.exports = async (req, res) => {
  if (!isDbConnected() && process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[Vercel Serverless] DB connection attempt failed:', err.message);
    }
  }

  return app(req, res);
};
