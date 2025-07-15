// src/features/tunneling/routes.js
// Express router for tunnel management endpoints.
const express = require('express');
const router = express.Router();

/**
 * GET /status
 * Returns tunnel status.
 */
router.get('/status', (_, res) => {
  res.json({ ok: true, feature: 'tunneling' });
});

module.exports = router;
