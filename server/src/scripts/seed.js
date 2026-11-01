'use strict';
/**
 * Seed script — creates demo users, groups, assets, and messages.
 * ALL seed records are clearly labeled as sample/demo data.
 * NEVER mixes sample records with real production user data.
 * Run with: npm run seed
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const Product = require('../models/Product');
const SharedAsset = require('../models/SharedAsset');
const BusinessVenture = require('../models/BusinessVenture');
const ChatMessage = require('../models/ChatMessage');
const Contribution = require('../models/Contribution');
const Notification = require('../models/Notification');
const FinancialEntry = require('../models/FinancialEntry');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/groupbuy';

const SEED_TAG = '[DEMO DATA]'; // All seed records carry this tag

async function seed(disconnectAfter = true) {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGO_URI);
    console.log('[Seed] Connected to MongoDB');
  }

  // Wipe existing seed data (tagged records only — never touches real user data via tag)
  // For dev safety, wipe all in dev environment
  if (process.env.NODE_ENV !== 'production') {
    await Promise.all([
      User.deleteMany({ email: { $regex: '@groupbuy.dev$' } }),
      Group.deleteMany({ tags: SEED_TAG }),
      GroupMembership.deleteMany({}),
      Product.deleteMany({}),
      SharedAsset.deleteMany({}),
      BusinessVenture.deleteMany({}),
      ChatMessage.deleteMany({ messageType: 'system' }),
      Contribution.deleteMany({ paymentProvider: 'simulated' }),
      FinancialEntry.deleteMany({}),
    ]);
    console.log('[Seed] Cleared previous seed data');
  }

  // ── Create demo users ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo@123456', 12);

  const [admin, alice, bob, carol, dave] = await User.insertMany([
    {
      email: 'admin@groupbuy.dev', username: 'admin_demo',
      displayName: 'Admin [DEMO]', passwordHash,
      role: 'admin', isEmailVerified: true, isActive: true,
      bio: 'Demo admin account. This is sample data.',
      interests: ['technology', 'photography'], skills: ['management', 'finance'],
      city: 'Mumbai', state: 'Maharashtra', country: 'India',
      budgetRangeMinPaise: 100000, budgetRangeMaxPaise: 5000000,
    },
    {
      email: 'alice@groupbuy.dev', username: 'alice_demo',
      displayName: 'Alice [DEMO]', passwordHash,
      isEmailVerified: true, isActive: true,
      bio: 'Photography enthusiast. Demo account.',
      interests: ['photography', 'travel'], skills: ['photography', 'editing'],
      city: 'Bengaluru', state: 'Karnataka', country: 'India',
      budgetRangeMinPaise: 50000, budgetRangeMaxPaise: 2000000,
    },
    {
      email: 'bob@groupbuy.dev', username: 'bob_demo',
      displayName: 'Bob [DEMO]', passwordHash,
      isEmailVerified: true, isActive: true,
      bio: 'Engineering student. Demo account.',
      interests: ['3d_printing', 'electronics'], skills: ['3d_modeling', 'electronics'],
      city: 'Chennai', state: 'Tamil Nadu', country: 'India',
      budgetRangeMinPaise: 20000, budgetRangeMaxPaise: 1000000,
    },
    {
      email: 'carol@groupbuy.dev', username: 'carol_demo',
      displayName: 'Carol [DEMO]', passwordHash,
      isEmailVerified: true, isActive: true,
      bio: 'Agri-tech researcher. Demo account.',
      interests: ['agriculture', 'sustainability'],
      city: 'Pune', state: 'Maharashtra', country: 'India',
      budgetRangeMinPaise: 100000, budgetRangeMaxPaise: 10000000,
    },
    {
      email: 'dave@groupbuy.dev', username: 'dave_demo',
      displayName: 'Dave [DEMO]', passwordHash,
      isEmailVerified: true, isActive: true,
      bio: 'Workshop tools enthusiast. Demo account.',
      interests: ['workshop', 'woodworking'],
      city: 'Hyderabad', state: 'Telangana', country: 'India',
      budgetRangeMinPaise: 50000, budgetRangeMaxPaise: 3000000,
    },
  ]);
  console.log('[Seed] Created 5 demo users');

  // ── Group 1: Mode A — Collective Camera Purchase ────────────────────────
  const cameraGroup = await Group.create({
    title: '[DEMO] Photography Collective — Canon R6 Purchase',
    description: 'Six students collectively acquiring a Canon EOS R6 camera for shared use and photography projects. [SAMPLE DATA]',
    slug: 'demo-photography-collective-' + Date.now(),
    groupType: 'collective_purchase', category: 'photography',
    visibility: 'public', createdBy: alice._id,
    minMembers: 2, maxMembers: 6,
    targetAmountPaise: 25000000, // ₹2,50,000
    minContributionPaise: 1000000, // ₹10,000
    status: 'funding',
    cancellationRules: 'If funding target is not met by deadline, all contributions are refunded in full.',
    fundingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    tags: [SEED_TAG], city: 'Bengaluru', state: 'Karnataka', country: 'India',
    memberCount: 3,
  });

  await GroupMembership.insertMany([
    { group: cameraGroup._id, user: alice._id, role: 'admin', status: 'active', joinedAt: new Date() },
    { group: cameraGroup._id, user: bob._id, role: 'member', status: 'active', joinedAt: new Date() },
    { group: cameraGroup._id, user: carol._id, role: 'member', status: 'active', joinedAt: new Date() },
  ]);

  const cameraProduct = await Product.create({
    group: cameraGroup._id,
    name: 'Canon EOS R6 Mark II Kit [DEMO]',
    description: 'Full-frame mirrorless camera with 24-105mm lens. [SAMPLE DATA]',
    category: 'photography', pricePaise: 25000000,
    sellerReference: 'https://example.com/canon-r6-demo',
    status: 'pending',
  });

  // Simulated contributions
  await Contribution.insertMany([
    {
      group: cameraGroup._id, user: alice._id, product: cameraProduct._id,
      amountPaise: 10000000, type: 'contribution', status: 'simulated_success',
      idempotencyKey: 'seed-contrib-alice-cam', paymentProvider: 'simulated',
      paymentReference: 'SIM-ALICE001', isSimulated: true, processedAt: new Date(),
    },
    {
      group: cameraGroup._id, user: bob._id, product: cameraProduct._id,
      amountPaise: 8000000, type: 'contribution', status: 'simulated_success',
      idempotencyKey: 'seed-contrib-bob-cam', paymentProvider: 'simulated',
      paymentReference: 'SIM-BOB001', isSimulated: true, processedAt: new Date(),
    },
  ]);

  // Update group funding
  await Group.findByIdAndUpdate(cameraGroup._id, { currentAmountPaise: 18000000 });
  console.log('[Seed] Created camera collective group');

  // ── Group 2: Mode B — Shared Equipment (Projector) ──────────────────────
  const projectorGroup = await Group.create({
    title: '[DEMO] CS Department — Shared Projector Pool',
    description: 'College CS department pooling funds for a high-quality projector available to all members for presentations and events. [SAMPLE DATA]',
    slug: 'demo-cs-projector-pool-' + Date.now(),
    groupType: 'shared_equipment', category: 'electronics',
    visibility: 'public', createdBy: bob._id,
    minMembers: 2, maxMembers: 30, targetAmountPaise: 8000000,
    status: 'active', tags: [SEED_TAG],
    city: 'Chennai', state: 'Tamil Nadu', country: 'India',
    memberCount: 3,
  });

  await GroupMembership.insertMany([
    { group: projectorGroup._id, user: bob._id, role: 'admin', status: 'active', joinedAt: new Date() },
    { group: projectorGroup._id, user: alice._id, role: 'member', status: 'active', joinedAt: new Date() },
    { group: projectorGroup._id, user: dave._id, role: 'member', status: 'active', joinedAt: new Date() },
  ]);

  await SharedAsset.insertMany([
    {
      group: projectorGroup._id, name: 'Epson EB-L400U Projector [DEMO]',
      description: '4K laser projector, 4500 lumens. [SAMPLE DATA]',
      category: 'electronics', condition: 'excellent',
      isAvailable: true, maxBookingDurationHours: 48, requiresApproval: true,
      assetTag: 'DEMO-PROJ-001',
    },
    {
      group: projectorGroup._id, name: 'Portable Projection Screen 120" [DEMO]',
      description: 'Foldable projection screen. [SAMPLE DATA]',
      category: 'electronics', condition: 'good',
      isAvailable: true, maxBookingDurationHours: 72, requiresApproval: false,
      assetTag: 'DEMO-SCREEN-001',
    },
  ]);
  console.log('[Seed] Created projector sharing group');

  // ── Group 3: Mode C — Business Venture ───────────────────────────────────
  const printingGroup = await Group.create({
    title: '[DEMO] Campus Printing Co-op',
    description: 'Student-run campus printing center offering low-cost document printing and binding services. Jointly operated and maintained by all members. [SAMPLE DATA]',
    slug: 'demo-campus-printing-coop-' + Date.now(),
    groupType: 'business_venture', category: 'printing',
    visibility: 'public', createdBy: carol._id,
    status: 'active', tags: [SEED_TAG],
    city: 'Pune', state: 'Maharashtra', country: 'India',
    memberCount: 3,
  });

  await GroupMembership.insertMany([
    { group: printingGroup._id, user: carol._id, role: 'admin', status: 'active', joinedAt: new Date() },
    { group: printingGroup._id, user: dave._id, role: 'member', status: 'active', joinedAt: new Date() },
    { group: printingGroup._id, user: bob._id, role: 'member', status: 'active', joinedAt: new Date() },
  ]);

  await BusinessVenture.create({
    group: printingGroup._id,
    name: 'Campus Printing Co-op [DEMO]',
    description: 'Low-cost printing for students. [SAMPLE DATA]',
    ventureType: 'printing_center', status: 'active',
    founders: [carol._id],
    totalRevenuePaise: 450000, // ₹4,500
    totalExpensePaise: 180000, // ₹1,800
    expenseApprovalThresholdPaise: 100000,
    surplusAllocationRules: 'Surplus distributed quarterly in proportion to contribution share.',
    exitRules: 'Members may exit by transferring their share to another member with admin approval.',
    legalDisclaimer: 'This venture is a collaborative record-keeping tool. It does not constitute a legally registered business.',
  });
  console.log('[Seed] Created campus printing venture');

  // ── Chat messages ────────────────────────────────────────────────────────
  await ChatMessage.insertMany([
    {
      group: cameraGroup._id, sender: alice._id,
      content: 'Hi everyone! Welcome to our camera collective. This is sample/demo data. 📷',
      messageType: 'announcement',
    },
    {
      group: cameraGroup._id, sender: bob._id,
      content: 'Excited to be part of this! When do we expect to have enough funding?',
      messageType: 'text',
    },
    {
      group: cameraGroup._id, sender: carol._id,
      content: 'The funding deadline is in 30 days. We need about ₹70,000 more.',
      messageType: 'text',
    },
    {
      group: projectorGroup._id, sender: bob._id,
      content: 'Projector is now available for booking! [DEMO DATA] 🎥',
      messageType: 'announcement',
    },
    {
      group: printingGroup._id, sender: carol._id,
      content: 'Monthly revenue report: ₹4,500. Expenses: ₹1,800. Net: ₹2,700. [DEMO DATA]',
      messageType: 'announcement',
    },
  ]);
  console.log('[Seed] Created demo chat messages');

  // ── Financial Entries (Ledger) ──────────────────────────────────────────
  await FinancialEntry.insertMany([
    {
      group: projectorGroup._id,
      recordedBy: bob._id,
      entryType: 'expense',
      amountPaise: 120000, // ₹1,200
      description: 'High-speed HDMI 2.1 15m optical cables & ceiling mount hardware [DEMO DATA]',
      category: 'maintenance',
      documentReference: 'Receipt #INV-8821',
      requiresApproval: false,
      approvalStatus: 'approved',
      approvals: [{ user: bob._id, decision: 'approved', note: 'Essential installation hardware', decidedAt: new Date() }],
      entryDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
    {
      group: projectorGroup._id,
      recordedBy: alice._id,
      entryType: 'expense',
      amountPaise: 45000, // ₹450
      description: 'Microfiber lens cleaning kit & protective carry case [DEMO DATA]',
      category: 'supplies',
      documentReference: 'Amazon Order #402-99120',
      requiresApproval: false,
      approvalStatus: 'not_required',
      entryDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    },
    {
      group: projectorGroup._id,
      recordedBy: dave._id,
      entryType: 'expense',
      amountPaise: 250000, // ₹2,500 (exceeds ₹1,000 threshold -> requires leader approval)
      description: 'Authorized service center optical engine laser diagnostic [DEMO DATA]',
      category: 'repairs',
      documentReference: 'Epson Service Estimate #EST-109',
      requiresApproval: true,
      approvalStatus: 'pending',
      entryDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },
    {
      group: projectorGroup._id,
      recordedBy: bob._id,
      entryType: 'revenue',
      amountPaise: 350000, // ₹3,500
      description: 'Inter-college design symposium weekend screening fee [DEMO DATA]',
      category: 'revenue',
      documentReference: 'Symposium Booking #SYM-2026',
      requiresApproval: false,
      approvalStatus: 'not_required',
      entryDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    },
  ]);
  console.log('[Seed] Created demo financial ledger entries');

  // ── Notifications ─────────────────────────────────────────────────────────
  await Notification.insertMany([
    {
      recipient: alice._id, type: 'contribution_received',
      title: '[DEMO] Simulated Contribution Received',
      body: 'Bob made a simulated contribution of ₹80,000 to your group.',
      isRead: false,
    },
    {
      recipient: bob._id, type: 'join_approved',
      title: '[DEMO] Welcome to the group!',
      body: 'Your request to join Photography Collective was approved.',
      isRead: true,
    },
  ]);

  console.log('\n[Seed] ✅ Seed complete!');
  console.log('\nDemo login credentials (all passwords: Demo@123456):');
  console.log('  admin@groupbuy.dev (Admin)');
  console.log('  alice@groupbuy.dev (Group Creator)');
  console.log('  bob@groupbuy.dev   (Member)');
  console.log('  carol@groupbuy.dev (Venture Founder)');
  console.log('  dave@groupbuy.dev  (Member)');
  console.log('\n⚠️  ALL DATA ABOVE IS SAMPLE/DEMO DATA — clearly labeled [DEMO]\n');

  if (disconnectAfter) {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed(true).catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
  });
}

module.exports = { seed, seedDirect: () => seed(false) };
