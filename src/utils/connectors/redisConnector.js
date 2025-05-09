const Redis = require('ioredis');

class RedisConnector {
  constructor({ connectionString }) {
    this.client = new Redis(connectionString);
  }

  async collectionExists(name) {
    const exists = await this.client.sismember('cp:collections', name);
    return exists === 1;
  }

  async createCollection(name) {
    await this.client.sadd('cp:collections', name);
  }

  async addVectors(name, vectors) {
    const pipeline = this.client.pipeline();
    vectors.forEach(v => {
      pipeline.hset(`cp:collection:${name}`, v.id, JSON.stringify(v.vector));
    });
    await pipeline.exec();
  }

  async queryCollection(name, query, options = {}) {
    return await this.client.hgetall(`cp:collection:${name}`);
  }

  async updateRecords(name, ids, metadatas) {
    const pipeline = this.client.pipeline();
    for (let i = 0; i < ids.length; i++) {
      const currentData = await this.client.hget(`cp:collection:${name}`, ids[i]);
      if (currentData) {
        const vector = JSON.parse(currentData);
        vector.metadata = metadatas[i];
        pipeline.hset(`cp:collection:${name}`, ids[i], JSON.stringify(vector));
      }
    }
    await pipeline.exec();
  }
}

module.exports = RedisConnector;