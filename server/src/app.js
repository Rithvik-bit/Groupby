'use strict';
/**
 * Express application setup.
 * Security middleware applied in order: helmet → cors → rate-limit → body parsers → routes.
 */
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB, isDbConnected, supportsTransactions } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { setupChatSocket } = require('./sockets/chatSocket');
const { validateEnvironment } = require('./utils/validateEnv');
const { csrfProtection } = require('./middleware/csrf');

// Validate security and environment settings
validateEnvironment();

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const chatRoutes = require('./routes/chatRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const userBookingRoutes = require('./routes/userBookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const financialRoutes = require('./routes/financialRoutes');
const ownershipTransferRoutes = require('./routes/ownershipTransferRoutes');

const app = express();
const httpServer = http.createServer(app);

// ── Socket.IO setup ───────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
setupChatSocket(io);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'dev_cookie_secret'));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } },
}));

// ── Trust proxy (for accurate IPs behind load balancer) ──────────────────────
app.set('trust proxy', 1);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: isDbConnected(),
      transactionsSupported: supportsTransactions(),
    },
    version: '1.0.0',
  });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use(csrfProtection);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/groups/:groupId/chat', chatRoutes);
app.use('/api/groups/:groupId/contributions', contributionRoutes);
app.use('/api/groups/:groupId/assets', bookingRoutes);
app.use('/api/groups/:groupId/financials', financialRoutes);
app.use('/api/groups/:groupId/transfers', ownershipTransferRoutes);
app.use('/api/bookings', userBookingRoutes);
app.use('/api/notifications', notificationRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
async function start() {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`[Server] GroupBuy API running on http://localhost:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, httpServer };
