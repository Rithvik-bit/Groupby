'use strict';
/**
 * Email service — delegates to configured EmailProvider (ConsoleProvider in dev, SMTP in prod).
 * NEVER logs or exposes sensitive passwords or session credentials.
 */

const { getEmailProvider } = require('./emailProvider');

const provider = getEmailProvider();

async function sendVerificationEmail(toEmail, token) {
  return provider.sendVerificationEmail(toEmail, token);
}

async function sendPasswordResetEmail(toEmail, token) {
  return provider.sendPasswordResetEmail(toEmail, token);
}

async function sendNotificationEmail(toEmail, subject, body) {
  return provider.sendNotificationEmail(toEmail, subject, body);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  provider,
};
