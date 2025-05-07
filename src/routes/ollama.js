const express = require('express');
const router = express.Router();
const ollamaAPI = require('../utils/api');
const logger = require('../utils/logger');

// Health check
router.get('/status', (_, res) => res.json({ ok: true }));

// Chat endpoint (interactive chat)
router.post('/api/chat', async (req, res, next) => {
  try {
    logger.info('Chat request received', { model: req.body.model });
    const upstream = await ollamaAPI.chat(req.body);
    res.type('application/json');
    upstream.data.on('error', (error) => {
      logger.error('Stream error in chat:', error);
      res.status(500).json({ error: 'Stream error', details: error.message });
    });
    upstream.data.pipe(res);
  } catch (err) {
    logger.error('Chat error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Chat error',
      details: err.details || 'Unknown error'
    });
  }
});

// Generate endpoint (one-time response)
router.post('/api/generate', async (req, res, next) => {
  try {
    logger.info('Generate request received', { model: req.body.model, stream: req.body.stream });
    const upstream = await ollamaAPI.generate(req.body);
    res.type('application/json');
    
    if (req.body.stream) {
      upstream.data.on('error', (error) => {
        logger.error('Stream error in generate:', error);
        res.status(500).json({ error: 'Stream error', details: error.message });
      });
      upstream.data.pipe(res);
    } else {
      res.json(upstream.data);
    }
  } catch (err) {
    logger.error('Generate error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Generation error',
      details: err.details || 'Unknown error'
    });
  }
});

// List all models
router.get('/api/tags', async (req, res, next) => {
  try {
    logger.info('Tags request received');
    const response = await ollamaAPI.getTags();
    res.json(response.data);
  } catch (err) {
    logger.error('Tags error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Tags error',
      details: err.details || 'Unknown error'
    });
  }
});

// Create embeddings
router.post('/api/embeddings', async (req, res, next) => {
  try {
    logger.info('Embeddings request received', { model: req.body.model });
    const response = await ollamaAPI.createEmbeddings(req.body);
    res.json(response.data);
  } catch (err) {
    logger.error('Embeddings error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Embeddings error',
      details: err.details || 'Unknown error'
    });
  }
});

module.exports = router;