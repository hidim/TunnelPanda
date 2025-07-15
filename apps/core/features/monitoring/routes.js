// src/features/monitoring/routes.js
// Express router for monitoring and logging endpoints.
const express = require('express');
const router = express.Router();

/**
 * GET /status
 * Returns monitoring status and metrics.
 */
router.get('/status', (_, res) => {
  res.json({ ok: true, feature: 'monitoring' });
});

module.exports = router;
