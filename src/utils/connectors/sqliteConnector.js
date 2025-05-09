const sqlite3 = require('sqlite3').verbose();

/**
 * SqliteConnector provides methods to interact with a SQLite database for vector storage.
 * Supports collection existence check, creation, vector addition, querying, and record updates.
 */
class SqliteConnector {
  constructor({ filePath }) {
    this.db = new sqlite3.Database(filePath);
  }

  /**
   * Checks if a table (collection) exists in the database.
   * @param {string} name - Table name
   * @returns {Promise<boolean>} True if the table exists, false otherwise.
   */
  collectionExists(name) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [name],
        (err, row) => (err ? reject(err) : resolve(!!row))
      );
    });
  }

  /**
   * Creates a new table (collection) if it does not exist.
   * @param {string} name - Table name
   * @returns {Promise<void>} Resolves when the table is created.
   */
  createCollection(name) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, vector JSON)`,
        err => (err ? reject(err) : resolve())
      );
    });
  }

  /**
   * Adds or replaces vectors in the specified table.
   * @param {string} name - Table name
   * @param {Array} vectors - Array of vector objects to add or replace.
   */
  addVectors(name, vectors) {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ${name} (id, vector) VALUES (?, ?)`
    );
    vectors.forEach(v => stmt.run(v.id, JSON.stringify(v.vector)));
    stmt.finalize();
  }

  /**
   * Queries all rows from the specified table. (Simple example)
   * @param {string} name - Table name
   * @param {any} query - Query parameters (unused)
   * @param {object} options - Query options (unused)
   * @returns {Promise<Array>} Array of all rows in the table.
   */
  queryCollection(name, query, options = {}) {
    // Simple example: returns all rows
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM ${name}`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });
  }

  /**
   * Updates the metadata of records in the specified table.
   * @param {string} name - Table name
   * @param {Array} ids - Array of record IDs
   * @param {Array} metadatas - Array of metadata objects to update
   * @returns {Promise<void>} Resolves when the update is complete.
   */
  updateRecords(name, ids, metadatas) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const stmt = this.db.prepare(
          `UPDATE ${name} 
           SET vector = json_patch(vector, json_object('metadata', ?))
           WHERE id = ?`
        );
        
        try {
          for (let i = 0; i < ids.length; i++) {
            stmt.run(JSON.stringify(metadatas[i]), ids[i]);
          }
          stmt.finalize();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

module.exports = SqliteConnector;