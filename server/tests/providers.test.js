'use strict';
/**
 * Provider interface and abstraction unit tests.
 * Requirements 10 & 11:
 * - PaymentProvider with clearly labeled SimulatedProvider (no real funds implied).
 * - EmailProvider with development ConsoleProvider (safe logging, no secret exposure).
 */
const {
  PaymentProvider,
  SimulatedPaymentProvider,
  getPaymentProvider,
} = require('../src/services/paymentProvider');

const {
  EmailProvider,
  ConsoleEmailProvider,
  getEmailProvider,
} = require('../src/services/emailProvider');

describe('PaymentProvider & SimulatedPaymentProvider', () => {
  test('abstract provider throws if methods not implemented', async () => {
    const abstractProvider = new PaymentProvider();
    await expect(abstractProvider.processPayment({})).rejects.toThrow();
    await expect(abstractProvider.verifyPayment('SIM-123')).rejects.toThrow();
    await expect(abstractProvider.processRefund({})).rejects.toThrow();
    expect(abstractProvider.getProviderName()).toBe('abstract');
  });

  test('SimulatedPaymentProvider processes payment with explicit simulation disclaimers', async () => {
    const provider = getPaymentProvider('simulated');
    expect(provider).toBeInstanceOf(SimulatedPaymentProvider);
    expect(provider.isSimulated).toBe(true);

    const paymentResult = await provider.processPayment({
      amountPaise: 500000,
      metadata: { groupId: 'g123' },
    });

    expect(paymentResult.success).toBe(true);
    expect(paymentResult.status).toBe('completed');
    expect(paymentResult.isSimulated).toBe(true);
    expect(paymentResult.paymentProvider).toBe('simulated');
    expect(paymentResult.paymentReference).toMatch(/^SIM-/);
    expect(paymentResult.disclaimer).toContain('NO REAL CURRENCY');
  });

  test('SimulatedPaymentProvider rejects non-integer or negative paise', async () => {
    const provider = new SimulatedPaymentProvider();
    await expect(provider.processPayment({ amountPaise: -500 })).rejects.toThrow('positive integer paise');
    await expect(provider.processPayment({ amountPaise: 50.5 })).rejects.toThrow('positive integer paise');
    await expect(provider.processPayment({ amountPaise: 0 })).rejects.toThrow('positive integer paise');
  });

  test('SimulatedPaymentProvider verifies and refunds simulated payments', async () => {
    const provider = new SimulatedPaymentProvider();
    const verified = await provider.verifyPayment('SIM-TEST1234');
    expect(verified.success).toBe(true);
    expect(verified.isSimulated).toBe(true);

    const invalid = await provider.verifyPayment('REAL-INVALID');
    expect(invalid.success).toBe(false);

    const refund = await provider.processRefund({
      paymentReference: 'SIM-TEST1234',
      amountPaise: 500000,
    });
    expect(refund.success).toBe(true);
    expect(refund.isSimulated).toBe(true);
    expect(refund.disclaimer).toContain('SIMULATION ONLY');
  });
});

describe('EmailProvider & ConsoleEmailProvider', () => {
  test('abstract email provider throws if methods not implemented', async () => {
    const abstractProvider = new EmailProvider();
    await expect(abstractProvider.sendEmail({})).rejects.toThrow();
    await expect(abstractProvider.sendVerificationEmail('a@b.com', 'tok')).rejects.toThrow();
    await expect(abstractProvider.sendPasswordResetEmail('a@b.com', 'tok')).rejects.toThrow();
    await expect(abstractProvider.sendNotificationEmail('a@b.com', 'sub', 'body')).rejects.toThrow();
  });

  test('ConsoleEmailProvider logs safely without error', async () => {
    const provider = getEmailProvider('console');
    expect(provider).toBeInstanceOf(ConsoleEmailProvider);

    const verRes = await provider.sendVerificationEmail('user@example.com', 'safe-token-hex');
    expect(verRes.success).toBe(true);
    expect(verRes.provider).toBe('console');

    const resetRes = await provider.sendPasswordResetEmail('user@example.com', 'safe-reset-token');
    expect(resetRes.success).toBe(true);

    const notifRes = await provider.sendNotificationEmail('user@example.com', 'Group Update', 'New member joined');
    expect(notifRes.success).toBe(true);
  });
});
