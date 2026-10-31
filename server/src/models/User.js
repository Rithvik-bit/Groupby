'use strict';
/**
 * User model
 * Passwords are NEVER exposed in toJSON; hashed with bcryptjs.
 * Refresh tokens, email verification tokens, and password reset tokens are stored as SHA-256 hashes.
 * Financial details and private fields are strictly excluded from public projections.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-zA-Z0-9_.-]+$/,
    },
    displayName: { type: String, trim: true, maxlength: 60 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },

    // Email verification (hashed token)
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    // Password reset (hashed token)
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Profile details
    bio: { type: String, maxlength: 500, default: '' },
    avatarUrl: { type: String, default: '' },
    interests: [{ type: String, maxlength: 50 }],
    skills: [{ type: String, maxlength: 50 }],
    preferredAssetCategories: [{ type: String, maxlength: 50 }],
    budgetRangeMinPaise: { type: Number, default: 0, min: 0 }, // integer paise
    budgetRangeMaxPaise: { type: Number, default: 0, min: 0 },

    // Location (city/region only; no exact physical street address)
    city: { type: String, maxlength: 60, default: '' },
    state: { type: String, maxlength: 60, default: '' },
    country: { type: String, maxlength: 60, default: '' },

    // Privacy settings
    profileVisibility: {
      type: String,
      enum: ['public', 'members_only', 'private'],
      default: 'public',
    },
    showEmail: { type: Boolean, default: false },
    showBudget: { type: Boolean, default: false },

    // Verification badge
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified'],
      default: 'unverified',
    },

    // Account state & lifecycle
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date },
    bannedReason: { type: String, select: false },
    deletedAt: { type: Date, select: false }, // soft delete timestamp

    // Refresh token family tracking (for rotation & reuse detection)
    refreshTokenHash: { type: String, select: false },
    refreshTokenFamily: { type: String, select: false },

    // Blocked users
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ verificationStatus: 1 });
userSchema.index({ createdAt: -1 });

// ── Hooks ────────────────────────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

// ── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

/**
 * Filter profile according to privacy settings and requesting viewer identity.
 * @param {Object} viewer - Authenticated user { id, role } or null
 * @returns {Object} Cleaned profile object
 */
userSchema.methods.toSanitizedProfile = function (viewer = null) {
  const isSelf = viewer && viewer.id && viewer.id.toString() === this._id.toString();
  const isAdmin = viewer && viewer.role === 'admin';

  if (isSelf || isAdmin) {
    return {
      id: this._id,
      email: this.email,
      username: this.username,
      displayName: this.displayName,
      role: this.role,
      isEmailVerified: this.isEmailVerified,
      bio: this.bio,
      avatarUrl: this.avatarUrl,
      interests: this.interests,
      skills: this.skills,
      preferredAssetCategories: this.preferredAssetCategories,
      budgetRangeMinPaise: this.budgetRangeMinPaise,
      budgetRangeMaxPaise: this.budgetRangeMaxPaise,
      city: this.city,
      state: this.state,
      country: this.country,
      profileVisibility: this.profileVisibility,
      showEmail: this.showEmail,
      showBudget: this.showBudget,
      verificationStatus: this.verificationStatus,
      createdAt: this.createdAt,
    };
  }

  // Base public fields
  const base = {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatarUrl: this.avatarUrl,
    verificationStatus: this.verificationStatus,
  };

  // If private, reveal only minimal public card
  if (this.profileVisibility === 'private') {
    return base;
  }

  const profile = {
    ...base,
    bio: this.bio,
    interests: this.interests,
    skills: this.skills,
    city: this.city,
    state: this.state,
    country: this.country,
    profileVisibility: this.profileVisibility,
    createdAt: this.createdAt,
  };

  if (this.showEmail) {
    profile.email = this.email;
  }
  if (this.showBudget) {
    profile.budgetRangeMinPaise = this.budgetRangeMinPaise;
    profile.budgetRangeMaxPaise = this.budgetRangeMaxPaise;
  }

  return profile;
};

// ── toJSON — strip sensitive internal credentials ───────────────────────────
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.emailVerifyTokenHash;
    delete ret.emailVerifyExpires;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.refreshTokenHash;
    delete ret.refreshTokenFamily;
    delete ret.bannedReason;
    delete ret.deletedAt;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
