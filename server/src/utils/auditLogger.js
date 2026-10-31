'use strict';
/**
 * Audit logger utility
 * Creates append-only AuditLog entries. Never logs passwords or secrets.
 */
const AuditLog = require('../models/AuditLog');

async function log({ actor, action, entityType, entityId, relatedGroup, snapshot, ipAddress, userAgent, severity = 'info' }) {
  try {
    // Remove any sensitive fields from snapshot
    const safeSnapshot = snapshot ? sanitizeSnapshot(snapshot) : undefined;
    await AuditLog.create({
      actor: actor || null,
      action,
      entityType,
      entityId: entityId || null,
      relatedGroup: relatedGroup || null,
      snapshot: safeSnapshot,
      ipAddress: ipAddress || '',
      userAgent: userAgent || '',
      severity,
    });
  } catch (err) {
    // Audit log failure must not crash the main operation
    console.error('[AuditLog] Failed to write:', err.message);
  }
}

function sanitizeSnapshot(obj) {
  const forbidden = new Set([
    'password', 'passwordHash', 'passwordResetToken', 'emailVerifyToken',
    'refreshTokenHash', 'inviteToken', 'secret', 'token', 'creditCard',
  ]);
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (forbidden.has(k)) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeSnapshot(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

module.exports = { log };
