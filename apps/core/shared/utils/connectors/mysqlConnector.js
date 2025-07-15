const mysql = require('mysql2/promise');

class MysqlConnector {
  constructor({ connectionString }) {
    this.connectionPromise = mysql.createConnection(connectionString);
  }

  async _getConn() {
    if (!this.connection) {
      this.connection = await this.connectionPromise;
    }
    return this.connection;
  }

  async collectionExists(name) {
    const conn = await this._getConn();
    const [rows] = await conn.query(`SHOW TABLES LIKE ?`, [name]);
    return rows.length > 0;
  }

  async createCollection(name) {
    const conn = await this._getConn();
    await conn.query(
      `CREATE TABLE IF NOT EXISTS \`${name}\` (
         id VARCHAR(255) PRIMARY KEY,
         vector JSON
       )`
    );
  }

  async addVectors(name, vectors) {
    const conn = await this._getConn();
    const values = vectors.map(v => [v.id, JSON.stringify(v.vector)]);
    await conn.query(
      `INSERT INTO \`${name}\` (id, vector) VALUES ?
       ON DUPLICATE KEY UPDATE vector = VALUES(vector)`,
      [values]
    );
  }

  async queryCollection(name, query, options = {}) {
    const conn = await this._getConn();
    const [rows] = await conn.query(`SELECT * FROM \`${name}\``);
    return rows;
  }

  async updateRecords(name, ids, metadatas) {
    const conn = await this._getConn();
    for (let i = 0; i < ids.length; i++) {
      await conn.query(
        `UPDATE \`${name}\` 
         SET vector = JSON_SET(vector, '$.metadata', ?)
         WHERE id = ?`,
        [JSON.stringify(metadatas[i]), ids[i]]
      );
    }
  }

  /**
   * Deletes vectors from a collection by IDs.
   * @param {string} name - Collection name
   * @param {Array} ids - Array of vector IDs to delete
   * @returns {Promise<void>} Resolves when deletion is complete.
   */
  deleteVectors(name, ids) {
    // This method should be implemented by each connector.
    throw new Error('deleteVectors not implemented for this connector');
  }
}

module.exports = MysqlConnector;