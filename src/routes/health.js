const express = require('express');
const axios = require('axios');
const router = express.Router();
const cfg = require('../config');

// Local application health check
router.get('/status', (_, res) => {
  res.json({ ok: true, service: 'TunnelPanda' });
});

// Proxy to Ollama health endpoint
router.get('/v1/health', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'get',
      url: `${cfg.ollama.url}/v1/health`,
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