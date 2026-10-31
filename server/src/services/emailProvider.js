'use strict';

/**
 * Email Provider Interface and Development Console Provider.
 * 
 * CRITICAL ARCHITECTURAL REQUIREMENT:
 * Never log passwords, sensitive credentials, or session secrets.
 * In development, output clear, safe simulated dispatch messages.
 */

class EmailProvider {
  /**
   * @param {Object} params
   * @param {string} params.to
   * @param {string} params.subject
   * @param {string} [params.text]
   * @param {string} [params.html]
   * @returns {Promise<Object>}
   */
  async sendEmail(_params) {
    throw new Error('EmailProvider.sendEmail must be implemented by subclass');
  }

  async sendVerificationEmail(_toEmail, _token) {
    throw new Error('EmailProvider.sendVerificationEmail must be implemented by subclass');
  }

  async sendPasswordResetEmail(_toEmail, _token) {
    throw new Error('EmailProvider.sendPasswordResetEmail must be implemented by subclass');
  }

  async sendNotificationEmail(_toEmail, _subject, _body) {
    throw new Error('EmailProvider.sendNotificationEmail must be implemented by subclass');
  }

  getProviderName() {
    return 'abstract';
  }
}

class ConsoleEmailProvider extends EmailProvider {
  constructor(clientUrl = process.env.CLIENT_URL || 'http://localhost:5173') {
    super();
    this.clientUrl = clientUrl;
  }

  getProviderName() {
    return 'console';
  }

  async sendEmail({ to, subject, text }) {
    console.log(`[EMAIL:CONSOLE] To: ${to} | Subject: ${subject}`);
    if (text) {
      console.log(`[EMAIL:CONSOLE] Body preview: ${text.slice(0, 100)}...`);
    }
    return { success: true, provider: 'console', recipient: to };
  }

  async sendVerificationEmail(toEmail, token) {
    const link = `${this.clientUrl}/auth/verify-email/${token}`;
    console.log('\n------------------------------------------------------------');
    console.log(`[EMAIL:CONSOLE] Verification Email dispatched to: ${toEmail}`);
    console.log(`[EMAIL:CONSOLE] Dev Action Link: ${link}`);
    console.log('------------------------------------------------------------\n');
    return { success: true, provider: 'console', recipient: toEmail };
  }

  async sendPasswordResetEmail(toEmail, token) {
    const link = `${this.clientUrl}/auth/reset-password/${token}`;
    console.log('\n------------------------------------------------------------');
    console.log(`[EMAIL:CONSOLE] Password Reset Email dispatched to: ${toEmail}`);
    console.log(`[EMAIL:CONSOLE] Dev Action Link: ${link}`);
    console.log('------------------------------------------------------------\n');
    return { success: true, provider: 'console', recipient: toEmail };
  }

  async sendNotificationEmail(toEmail, subject, body) {
    console.log(`\n[EMAIL:CONSOLE] Notification to: ${toEmail} | Subject: ${subject}`);
    console.log(`[EMAIL:CONSOLE] Message: ${body}\n`);
    return { success: true, provider: 'console', recipient: toEmail };
  }
}

function getEmailProvider(providerName = process.env.EMAIL_PROVIDER || 'console') {
  switch (providerName.toLowerCase()) {
    case 'console':
    default:
      return new ConsoleEmailProvider();
  }
}

module.exports = {
  EmailProvider,
  ConsoleEmailProvider,
  getEmailProvider,
};
