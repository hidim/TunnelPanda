// src/routes/health.js
// Express router for health checks (local and upstream Ollama).
const express = require('express');
const axios = require('axios');
const router = express.Router();
const cfg = require('../config');

/**
 * GET /status
 * Returns local application health status.
 */
router.get('/status', (_, res) => {
  res.json({ ok: true, service: 'TunnelPanda' });
});

/**
 * GET /health
 * Proxies health check to upstream Ollama API.
 */
router.get('/health', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'get',
      url: `${cfg.ollama.url}/health`,
      headers: {
        'Authorization': cfg.ollama.apiKey ? `Bearer ${cfg.ollama.apiKey}` : undefined
      },
      responseType: 'json'
    });
    res.json(upstream.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;