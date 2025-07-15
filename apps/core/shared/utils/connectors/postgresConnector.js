const { Client } = require('pg');

class PostgresConnector {
  constructor({ connectionString }) {
    this.client = new Client({ connectionString });
    this.client.connect();
  }

  async collectionExists(name) {
    const res = await this.client.query(
      `SELECT to_regclass($1) AS exists`,
      [name]
    );
    return res.rows[0].exists !== null;
  }

  async createCollection(name) {
    await this.client.query(
      `CREATE TABLE IF NOT EXISTS ${name} (
         id TEXT PRIMARY KEY,
         vector JSONB
       )`
    );
  }

  async addVectors(name, vectors) {
    const query = `
      INSERT INTO ${name} (id, vector)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET vector = EXCLUDED.vector
    `;
    for (const v of vectors) {
      await this.client.query(query, [v.id, JSON.stringify(v.vector)]);
    }
  }

  async queryCollection(name, query, options = {}) {
    const res = await this.client.query(`SELECT * FROM ${name}`);
    return res.rows;
  }

  async updateRecords(name, ids, metadatas) {
    for (let i = 0; i < ids.length; i++) {
      const query = `
        UPDATE ${name}
        SET vector = jsonb_set(vector, '{metadata}', $1::jsonb)
        WHERE id = $2
      `;
      await this.client.query(query, [JSON.stringify(metadatas[i]), ids[i]]);
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

module.exports = PostgresConnector;