// src/routes/db.js
const express = require('express');
const { getDbClient } = require('../utils/dbFactory');
const router = express.Router();
const db = getDbClient();

// Her istekte önce koleksiyon kontrolü
router.use('/:collection', async (req, res, next) => {
  const col = req.params.collection;
  if (!await db.collectionExists(col)) {
    await db.createCollection(col);
  }
  next();
});

// Örnek: sorgu endpoint’i
router.post('/:collection/query', async (req, res, next) => {
  try {
    const results = await db.queryCollection(req.params.collection, req.body.query, req.body.options);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// Örnek: vektör ekleme endpoint’i
router.post('/:collection/add', async (req, res, next) => {
  try {
    await db.addVectors(req.params.collection, req.body.vectors);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;