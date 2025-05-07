const express = require('express');
const axios = require('axios');
const router = express.Router();
const cfg = require('../config');

// Sağlık durumu kontrolü
router.get('/status', (_, res) => res.json({ ok: true }));

// Sohbet oluşturma (stream destekli)
router.post('/api/generate', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'post',
      url: `${cfg.ollama.url}/api/generate`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cfg.ollama.apiKey ? `Bearer ${cfg.ollama.apiKey}` : undefined
      },
      data: req.body,
      responseType: 'stream'
    });
    res.type('application/json');
    upstream.data.pipe(res);
  } catch (err) {
    next(err);
  }
});

// Embedding oluşturma
router.post('/v1/embeddings', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'post',
      url: `${cfg.ollama.url}/v1/embeddings`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cfg.ollama.apiKey ? `Bearer ${cfg.ollama.apiKey}` : undefined
      },
      data: req.body,
      responseType: 'json'
    });
    res.json(upstream.data);
  } catch (err) {
    next(err);
  }
});

// Tüm modelleri listele
router.get('/v1/models', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'get',
      url: `${cfg.ollama.url}/v1/models`,
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

// Belirli bir modelin detayları
router.get('/v1/models/:model', async (req, res, next) => {
  try {
    const upstream = await axios({
      method: 'get',
      url: `${cfg.ollama.url}/v1/models/${encodeURIComponent(req.params.model)}`,
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

// Ollama servis sağlık kontrolü
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