'use strict';
/**
 * Global error handler middleware.
 * Never exposes stack traces in production.
 * Handles Mongoose validation errors, CastErrors, and JWT errors.
 */
const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const isDev = process.env.NODE_ENV === 'development';

  // Convert known error types to AppError
  if (err.name === 'CastError') {
    err = new AppError(`Invalid ${err.path}: ${err.value}`, 400, 'INVALID_ID');
  } else if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    err = new AppError(messages.join(', '), 400, 'VALIDATION_ERROR');
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    err = new AppError(`${field} already exists.`, 409, 'DUPLICATE_KEY');
  }

  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.isOperational ? err.message : 'An unexpected error occurred.',
    },
  };

  if (isDev) {
    payload.error.stack = err.stack;
    payload.error.detail = err.message;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
