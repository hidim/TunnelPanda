const sqlite3 = require('sqlite3').verbose();

class SqliteConnector {
  constructor({ filePath }) {
    this.db = new sqlite3.Database(filePath);
  }

  collectionExists(name) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [name],
        (err, row) => (err ? reject(err) : resolve(!!row))
      );
    });
  }

  createCollection(name) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, vector JSON)`,
        err => (err ? reject(err) : resolve())
      );
    });
  }

  addVectors(name, vectors) {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO ${name} (id, vector) VALUES (?, ?)`
    );
    vectors.forEach(v => stmt.run(v.id, JSON.stringify(v.vector)));
    stmt.finalize();
  }

  queryCollection(name, query, options = {}) {
    // Basit örnek: tüm satırları döndürür
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM ${name}`,
        [],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });
  }

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