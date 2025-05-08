const express = require('express');
const config = require('../config');
const { getDbClient } = require('../utils/dbFactory');
const router = express.Router();

// Use '/db' prefix in app.js, so here routes are relative: '/:collection'
router.use('/:collection', async (req, res, next) => {
  const { collection } = req.params;
  // Initialize DB client with env tenant/database
  const db = getDbClient();
  // Ensure collection exists
  if (!(await db.collectionExists(collection))) {
    await db.createCollection(collection);
  }
  req.db = db;
  next();
});

// Query vectors in a collection
router.post('/:collection/query', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const { query_embeddings, n_results, include } = req.body;
    const results = await req.db.queryCollection(
      collection,
      query_embeddings,
      { nResults: n_results, include }
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// Add vectors to a collection
router.post('/:collection/add', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const { ids, embeddings, metadatas, documents } = req.body;
    const vectors = ids.map((id, i) => ({
      id,
      embedding: embeddings[i],
      metadata: metadatas[i],
      document: documents[i],
    }));
    await req.db.addVectors(collection, vectors);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// Get records from a collection
router.post('/:collection/get', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const options = req.body || {};
    const results = await req.db.getCollectionRecords(collection, options);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;