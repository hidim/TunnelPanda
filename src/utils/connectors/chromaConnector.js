const axios = require('axios');

class ChromaConnector {
  constructor({ url, apiKey }) {
    // Normalize URL and set up HTTP client
    this.url = url.endsWith('/') ? url.slice(0, -1) : url;
    this.client = axios.create({
      baseURL: this.url,
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
    });
  }

  // Check if a collection exists
  async collectionExists(name) {
    const res = await this.client.get('/collections');
    const collections = res.data.collections || res.data.names || [];
    return collections.includes(name);
  }

  // Create a new collection
  async createCollection(name) {
    await this.client.post('/collections', { name });
  }

  // Query vectors in a collection
  async queryCollection(name, query, options = {}) {
    const res = await this.client.post(
      `/collections/${encodeURIComponent(name)}/query`,
      { query, options }
    );
    return res.data;
  }

  // Add vectors to a collection
  async addVectors(name, vectors) {
    await this.client.post(
      `/collections/${encodeURIComponent(name)}/add`,
      { vectors }
    );
  }
}

module.exports = ChromaConnector;