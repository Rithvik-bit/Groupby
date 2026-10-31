'use strict';

/**
 * Payment Provider Interface and Simulated Implementation.
 * 
 * CRITICAL ARCHITECTURAL REQUIREMENT:
 * Simulated contributions MUST NEVER imply that real funds have been collected.
 * Every response and record from the simulated provider explicitly marks the
 * transaction as a simulation with clear disclaimers.
 */

const { v4: uuidv4 } = require('uuid');

class PaymentProvider {
  /**
   * @param {Object} params
   * @param {number} params.amountPaise - Amount in integer paise
   * @param {string} [params.currency='INR']
   * @param {string} [params.idempotencyKey]
   * @param {Object} [params.metadata]
   * @returns {Promise<Object>}
   */
  async processPayment(_params) {
    throw new Error('PaymentProvider.processPayment must be implemented by subclass');
  }

  /**
   * @param {string} _paymentReference
   * @returns {Promise<Object>}
   */
  async verifyPayment(_paymentReference) {
    throw new Error('PaymentProvider.verifyPayment must be implemented by subclass');
  }

  /**
   * @param {Object} params
   * @param {string} params.paymentReference
   * @param {number} params.amountPaise
   * @param {string} [params.reason]
   * @returns {Promise<Object>}
   */
  async processRefund(_params) {
    throw new Error('PaymentProvider.processRefund must be implemented by subclass');
  }

  getProviderName() {
    return 'abstract';
  }
}

class SimulatedPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.isSimulated = true;
  }

  getProviderName() {
    return 'simulated';
  }

  /**
   * Simulate a payment without processing real currency.
   */
  async processPayment({ amountPaise, currency = 'INR', idempotencyKey, metadata = {} }) {
    if (!amountPaise || amountPaise <= 0 || !Number.isInteger(amountPaise)) {
      throw new Error('Invalid payment amount: must be positive integer paise');
    }

    const reference = `SIM-${uuidv4().slice(0, 8).toUpperCase()}`;

    return {
      success: true,
      status: 'completed',
      isSimulated: true,
      paymentProvider: 'simulated',
      paymentReference: reference,
      amountPaise,
      currency,
      idempotencyKey: idempotencyKey || uuidv4(),
      metadata,
      processedAt: new Date().toISOString(),
      disclaimer: '*** SIMULATION ONLY: NO REAL CURRENCY COLLECTED, PROCESSED, OR HELD ***',
    };
  }

  /**
   * Verify a simulated payment reference.
   */
  async verifyPayment(paymentReference) {
    if (!paymentReference || !paymentReference.startsWith('SIM-')) {
      return {
        success: false,
        status: 'not_found',
        isSimulated: true,
        message: 'Invalid simulated payment reference',
      };
    }

    return {
      success: true,
      status: 'completed',
      isSimulated: true,
      paymentProvider: 'simulated',
      paymentReference,
      verifiedAt: new Date().toISOString(),
      disclaimer: '*** SIMULATION ONLY: NO REAL CURRENCY COLLECTED, PROCESSED, OR HELD ***',
    };
  }

  /**
   * Simulate a refund.
   */
  async processRefund({ paymentReference, amountPaise, reason = 'requested_by_user' }) {
    const refundRef = `SIM-REF-${uuidv4().slice(0, 8).toUpperCase()}`;

    return {
      success: true,
      status: 'refunded',
      isSimulated: true,
      paymentProvider: 'simulated',
      originalPaymentReference: paymentReference,
      refundReference: refundRef,
      amountPaise,
      reason,
      refundedAt: new Date().toISOString(),
      disclaimer: '*** SIMULATION ONLY: NO REAL CURRENCY REFUNDED OR MOVED ***',
    };
  }
}

function getPaymentProvider(providerName = process.env.PAYMENT_PROVIDER || 'simulated') {
  switch (providerName.toLowerCase()) {
    case 'simulated':
    default:
      return new SimulatedPaymentProvider();
  }
}

module.exports = {
  PaymentProvider,
  SimulatedPaymentProvider,
  getPaymentProvider,
};
