'use strict';
/**
 * Auth Controller
 * Full lifecycle: Registration, login, family-tracked refresh rotation, reuse detection,
 * logout, email verification, password reset, password change, profile updates, and account deactivation.
 * Passwords, token hashes, and internal secrets are NEVER logged or exposed in API responses.
 */
const crypto = require('crypto');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } = require('../utils/jwt');
const { setCsrfCookie } = require('../middleware/csrf');
const AppError = require('../utils/AppError');
const audit = require('../utils/auditLogger');
const emailService = require('../services/emailService');

const isProd = process.env.NODE_ENV === 'production';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure: isProd,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ── Register ──────────────────────────────────────────────────────────────────
async function register(req, res, next) {
  try {
    const { email, username, password, displayName } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username';
      return next(new AppError(`${field} is already registered.`, 409, 'DUPLICATE_KEY'));
    }

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash: password, // pre-save hook hashes with bcrypt
      displayName: displayName || username,
      emailVerifyTokenHash: hashToken(rawVerifyToken),
      emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    await emailService.sendVerificationEmail(user.email, rawVerifyToken);

    await audit.log({
      actor: user._id,
      action: 'auth.register',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: { userId: user._id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(req, res, next) {
  try {
    const { email, identifier, password } = req.body;
    const lookup = (email || identifier || '').trim().toLowerCase();

    const user = await User.findOne({ email: lookup }).select('+passwordHash');
    // Generic error message prevents account enumeration
    if (!user) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }
    if (!user.isActive || user.isBanned) {
      return next(new AppError('Account is inactive or banned.', 403, 'ACCOUNT_INACTIVE'));
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
    }

    // New token family for this authenticated login session
    const tokenFamily = crypto.randomUUID();
    const tokenId = crypto.randomUUID();

    const accessPayload = { sub: user._id.toString(), role: user.role };
    const refreshPayload = { sub: user._id.toString(), family: tokenFamily, jti: tokenId };

    const accessToken = signAccessToken(accessPayload);
    const refreshToken = signRefreshToken(refreshPayload);

    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenFamily = tokenFamily;
    await user.save({ validateBeforeSave: false });

    // Set secure HttpOnly refresh cookie & double-submit CSRF cookie
    res.cookie('gb_refresh', refreshToken, COOKIE_OPTS);
    const csrfToken = setCsrfCookie(res);

    await audit.log({
      actor: user._id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        accessToken,
        csrfToken,
        user: user.toSanitizedProfile({ id: user._id, role: user.role }),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Refresh Token with Family Tracking & Reuse Detection ──────────────────────
async function refresh(req, res, next) {
  try {
    const token = req.cookies?.gb_refresh;
    if (!token) {
      return next(new AppError('Refresh token missing.', 401, 'TOKEN_MISSING'));
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      res.clearCookie('gb_refresh', { path: '/' });
      return next(new AppError('Invalid or expired refresh token.', 401, 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.sub).select('+refreshTokenHash +refreshTokenFamily isActive isBanned role');
    if (!user || !user.isActive || user.isBanned) {
      res.clearCookie('gb_refresh', { path: '/' });
      return next(new AppError('Session invalid or account inactive.', 401, 'SESSION_INVALID'));
    }

    const incomingHash = hashToken(token);

    // 1. If family doesn't match active session, session is expired
    if (decoded.family !== user.refreshTokenFamily) {
      res.clearCookie('gb_refresh', { path: '/' });
      return next(new AppError('Session expired. Please log in again.', 401, 'SESSION_EXPIRED'));
    }

    // 2. Token Reuse Detection:
    // If the family matches but the token hash does NOT match the latest hash,
    // an already-used token was re-submitted (indicating token theft or race).
    if (incomingHash !== user.refreshTokenHash) {
      // Invalidate the entire token family immediately
      user.refreshTokenHash = null;
      user.refreshTokenFamily = null;
      await user.save({ validateBeforeSave: false });

      await audit.log({
        actor: user._id,
        action: 'auth.refresh_token_reuse_detected',
        entityType: 'user',
        entityId: user._id,
        severity: 'critical',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.clearCookie('gb_refresh', { path: '/' });
      return next(new AppError('Refresh token reuse detected. All sessions in this family have been revoked.', 401, 'TOKEN_REUSE'));
    }

    // 3. Normal rotation: issue new token pair within the same family
    const newTokenId = crypto.randomUUID();
    const accessPayload = { sub: user._id.toString(), role: user.role };
    const refreshPayload = { sub: user._id.toString(), family: decoded.family, jti: newTokenId };

    const newAccessToken = signAccessToken(accessPayload);
    const newRefreshToken = signRefreshToken(refreshPayload);

    user.refreshTokenHash = hashToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.cookie('gb_refresh', newRefreshToken, COOKIE_OPTS);
    const csrfToken = setCsrfCookie(res);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        csrfToken,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
async function logout(req, res, next) {
  try {
    const token = req.cookies?.gb_refresh;
    if (token) {
      try {
        const decoded = verifyRefreshToken(token);
        await User.findByIdAndUpdate(decoded.sub, {
          refreshTokenHash: null,
          refreshTokenFamily: null,
        });

        await audit.log({
          actor: decoded.sub,
          action: 'auth.logout',
          entityType: 'user',
          entityId: decoded.sub,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      } catch {
        // Token was already expired or invalid
      }
    }

    res.clearCookie('gb_refresh', { path: '/' });
    res.clearCookie('gb_csrf', { path: '/' });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

// ── Email Verification ────────────────────────────────────────────────────────
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) return next(new AppError('Verification token required.', 400, 'TOKEN_REQUIRED'));

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpires: { $gt: Date.now() },
    }).select('+emailVerifyTokenHash +emailVerifyExpires');

    if (!user) {
      return next(new AppError('Verification token is invalid or has expired.', 400, 'INVALID_TOKEN'));
    }

    user.isEmailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
    await user.save({ validateBeforeSave: false });

    await audit.log({
      actor: user._id,
      action: 'auth.email_verified',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    next(err);
  }
}

// ── Forgot Password ───────────────────────────────────────────────────────────
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always respond with success to prevent user email enumeration
    if (!user || !user.isActive || user.isBanned) {
      return res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawResetToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save({ validateBeforeSave: false });

    await emailService.sendPasswordResetEmail(user.email, rawResetToken);

    await audit.log({
      actor: user._id,
      action: 'auth.password_reset_requested',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'If that email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

// ── Reset Password ────────────────────────────────────────────────────────────
async function resetPassword(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) return next(new AppError('Reset token required.', 400, 'TOKEN_REQUIRED'));

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return next(new AppError('Reset token is invalid or has expired.', 400, 'INVALID_TOKEN'));
    }

    user.passwordHash = password; // pre-save hook will bcrypt hash
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    // Invalidate all active sessions for security
    user.refreshTokenHash = undefined;
    user.refreshTokenFamily = undefined;
    await user.save();

    await audit.log({
      actor: user._id,
      action: 'auth.password_reset_completed',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.clearCookie('gb_refresh', { path: '/' });
    res.clearCookie('gb_csrf', { path: '/' });

    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
}

// ── Change Password (Authenticated) ───────────────────────────────────────────
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) return next(new AppError('User not found.', 404, 'NOT_FOUND'));

    const valid = await user.comparePassword(currentPassword);
    if (!valid) {
      return next(new AppError('Current password is incorrect.', 401, 'INVALID_CREDENTIALS'));
    }

    user.passwordHash = newPassword;
    user.refreshTokenHash = undefined;
    user.refreshTokenFamily = undefined;
    await user.save();

    await audit.log({
      actor: user._id,
      action: 'auth.password_changed',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.clearCookie('gb_refresh', { path: '/' });
    res.clearCookie('gb_csrf', { path: '/' });

    res.json({ success: true, message: 'Password updated successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

// ── Get Current User Profile ──────────────────────────────────────────────────
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) return next(new AppError('User not found.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: user.toSanitizedProfile(req.user) });
  } catch (err) {
    next(err);
  }
}

// ── Update Current User Profile ───────────────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) return next(new AppError('User not found.', 404, 'NOT_FOUND'));

    const allowedUpdates = [
      'displayName', 'bio', 'avatarUrl', 'interests', 'skills',
      'preferredAssetCategories', 'budgetRangeMinPaise', 'budgetRangeMaxPaise',
      'city', 'state', 'country', 'profileVisibility', 'showEmail', 'showBudget',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    await audit.log({
      actor: user._id,
      action: 'user.profile_updated',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: user.toSanitizedProfile(req.user) });
  } catch (err) {
    next(err);
  }
}

// ── Deactivate Account ────────────────────────────────────────────────────────
async function deactivateAccount(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found.', 404, 'NOT_FOUND'));

    user.isActive = false;
    user.deletedAt = new Date();
    user.refreshTokenHash = undefined;
    user.refreshTokenFamily = undefined;
    await user.save({ validateBeforeSave: false });

    await audit.log({
      actor: user._id,
      action: 'auth.account_deactivated',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.clearCookie('gb_refresh', { path: '/' });
    res.clearCookie('gb_csrf', { path: '/' });

    res.json({ success: true, message: 'Account deactivated successfully.' });
  } catch (err) {
    next(err);
  }
}

// ── CSRF Seed Endpoint ────────────────────────────────────────────────────────
async function getCsrfToken(_req, res) {
  const token = setCsrfCookie(res);
  res.json({ success: true, data: { csrfToken: token } });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  deactivateAccount,
  getCsrfToken,
};
