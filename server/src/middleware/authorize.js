'use strict';
/**
 * Authorization Middleware.
 * Provides fine-grained guards for resource ownership, self-checks, and administrative roles.
 * Prevents Insecure Direct Object Reference (IDOR) attacks across private accounts and resources.
 */
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Validates that an ID in req.params is a valid MongoDB ObjectId.
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

/**
 * Ensures the authenticated user matches the userId parameter in the route, or is a system admin.
 * @param {string} paramName - Name of parameter in req.params (e.g., 'userId')
 */
function requireSelfOrAdmin(paramName = 'userId') {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }

    const targetUserId = req.params[paramName];
    if (!targetUserId || !isValidObjectId(targetUserId)) {
      return next(new AppError('Invalid user ID parameter.', 400, 'INVALID_ID'));
    }

    const isSelf = req.user.id.toString() === targetUserId.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return next(new AppError('You do not have permission to access or modify this account.', 403, 'FORBIDDEN'));
    }

    next();
  };
}

/**
 * Guard that verifies the requesting user owns the targeted Mongoose document.
 * @param {mongoose.Model|string} model - Mongoose model to query
 * @param {string} paramName - Name of parameter containing document ID (default: 'id')
 * @param {string} ownerField - Field on document referencing owner ObjectId (default: 'user')
 */
function requireResourceOwner(model, paramName = 'id', ownerField = 'user') {
  return async (req, _res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
      }

      const resourceId = req.params[paramName];
      if (!resourceId || !isValidObjectId(resourceId)) {
        return next(new AppError('Invalid resource ID parameter.', 400, 'INVALID_ID'));
      }

      const Model = typeof model === 'string' ? mongoose.model(model) : model;
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return next(new AppError('Resource not found.', 404, 'NOT_FOUND'));
      }

      const ownerId = resource[ownerField]?.toString() || resource[ownerField]?._id?.toString();
      const isOwner = ownerId === req.user.id.toString();
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return next(new AppError('You are not authorized to modify or view this resource.', 403, 'FORBIDDEN'));
      }

      req.resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  isValidObjectId,
  requireSelfOrAdmin,
  requireResourceOwner,
};
