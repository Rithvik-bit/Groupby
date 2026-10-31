'use strict';
/**
 * Production environment and security configuration validator.
 * Requirement 3: Production configuration failures for missing secrets or insecure cookie settings.
 * Ensures production authentication secrets cannot fall back to predictable defaults.
 */

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors = [];

  const checkSecret = (name, minLength = 32) => {
    const val = process.env[name];
    if (!val) {
      errors.push(`Missing required security environment variable: ${name}`);
      return;
    }
    if (val.includes('REPLACE_WITH') || val.startsWith('dev_')) {
      errors.push(`Environment variable ${name} contains an insecure default placeholder.`);
    }
    if (val.length < minLength) {
      errors.push(`Environment variable ${name} must be at least ${minLength} characters long for cryptographic security.`);
    }
  };

  if (isProduction) {
    checkSecret('JWT_ACCESS_SECRET', 32);
    checkSecret('JWT_REFRESH_SECRET', 32);
    checkSecret('COOKIE_SECRET', 32);

    if (!process.env.MONGO_URI) {
      errors.push('Missing MONGO_URI in production environment.');
    }
    if (!process.env.CLIENT_URL || process.env.CLIENT_URL.includes('localhost')) {
      errors.push('CLIENT_URL must be configured with a production origin.');
    }
  }

  if (errors.length > 0) {
    const message = `[FATAL CONFIG ERROR]\n` + errors.map((e) => ` - ${e}`).join('\n');
    if (isProduction) {
      console.error(message);
      throw new Error(message);
    } else {
      console.warn(`[CONFIG WARNING] Non-production environment warnings:\n` + errors.map((e) => ` - ${e}`).join('\n'));
    }
  }

  return { isValid: errors.length === 0, errors };
}

module.exports = { validateEnvironment };
