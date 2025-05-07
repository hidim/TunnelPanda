const express = require('express');
const router = express.Router();
const ollamaAPI = require('../utils/api');

// Sağlık durumu kontrolü
router.get('/status', (_, res) => res.json({ ok: true }));

// Chat endpoint (interaktif sohbet)
router.post('/api/chat', async (req, res, next) => {
  try {
    const upstream = await ollamaAPI.chat(req.body);
    res.type('application/json');
    upstream.data.pipe(res);
  } catch (err) {
    next(err);
  }
});

// Generate endpoint (tek seferlik yanıt)
router.post('/api/generate', async (req, res, next) => {
  try {
    const upstream = await ollamaAPI.generate(req.body);
    res.type('application/json');
    upstream.data.pipe(res);
  } catch (err) {
    next(err);
  }
});

// Tüm modelleri listele
router.get('/api/tags', async (req, res, next) => {
  try {
    const response = await ollamaAPI.getTags();
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

// Embeddings oluşturma
router.post('/api/embeddings', async (req, res, next) => {
  try {
    const response = await ollamaAPI.createEmbeddings(req.body);
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;