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
}

module.exports = PostgresConnector;