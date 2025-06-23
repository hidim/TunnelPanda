// src/middleware/auth.js
// Authentication middleware for TunnelPanda. Checks Basic Auth and X-APP-TOKEN headers.
const basicAuth = require('basic-auth');
const cfg = require('../config');

/**
 * Authenticates requests using Basic Auth and X-APP-TOKEN header.
 * @param {object} req - Express request object or WebSocket upgrade request
 * @param {object} res - Express response object (can be null for WebSocket)
 * @param {function} next - Next middleware function
 */
function authenticate(req, res, next) {
  const user = basicAuth(req);
  const sendError = (code, msg) => {
    if (res && typeof res.status === 'function') {
      if (code === 401 && typeof res.set === 'function') {
        res.set('WWW-Authenticate', 'Basic realm="TunnelPanda"');
      }
      return res.status(code).send(msg);
    }

    if (typeof next === 'function') {
      const err = new Error(msg);
      err.status = code;
      return next(err);
    }

    return false;
  };

  if (!user || user.name !== cfg.auth.user || user.pass !== cfg.auth.pass) {
    return sendError(401, 'Authentication required.');
  }

  // Handle both Express and WebSocket request headers
  const token = (typeof req.get === 'function')
    ? req.get('X-APP-TOKEN')
    : (req.headers && (req.headers['x-app-token'] || req.headers['X-APP-TOKEN']));

  if (!token || token !== cfg.auth.appToken) {
    return sendError(403, 'Invalid or missing X-APP-TOKEN');
  }

  if (typeof next === 'function') {
    return next();
  }

  return true;
}

module.exports = authenticate;
