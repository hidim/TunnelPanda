// src/routes/db.js
// Express router for database vector operations (query, add, get, update) on collections.
const express = require('express');
const config = require('../config');
const { getDbClient } = require('../utils/dbFactory');
const router = express.Router();

// Middleware: Ensures collection exists and attaches db client to request.
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

/**
 * POST /:collection/query
 * Queries vectors in a collection.
 * Expects: { query_embeddings, n_results, include }
 * Returns: Query results
 */
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

/**
 * POST /:collection/add
 * Adds vectors to a collection.
 * Expects: { ids, embeddings, metadatas, documents }
 */
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

/**
 * POST /:collection/get
 * Gets records from a collection.
 * Expects: options in body
 * Returns: Records
 */
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

/**
 * POST /:collection/update
 * Updates records in a collection.
 * Expects: { ids, metadatas }
 */
router.post('/:collection/update', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const { ids, metadatas } = req.body;
    
    if (!Array.isArray(ids) || !Array.isArray(metadatas) || ids.length !== metadatas.length) {
      return res.status(400).json({ 
        error: 'Invalid request format', 
        message: 'Both ids and metadatas must be arrays of the same length' 
      });
    }

    await req.db.updateRecords(collection, ids, metadatas);
    res.status(200).json({ message: 'Records updated successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /:collection/delete
 * Deletes vectors from a collection by IDs.
 * Expects: { ids }
 * Returns: Success message
 */
router.post('/:collection/delete', async (req, res, next) => {
  try {
    const { collection } = req.params;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid request format', message: 'ids must be a non-empty array' });
    }
    await req.db.deleteVectors(collection, ids);
    res.status(200).json({ message: 'Vectors deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;