// ChromaConnector provides methods to interact with a Chroma vector database via HTTP API.
// Supports listing collections, checking existence, creating collections, querying, adding vectors, retrieving records, and updating records.
const axios = require('axios');

class ChromaConnector {
  constructor({ url, apiKey, tenant, database }) {
    // Normalize URL and set up HTTP client
    this.base = url.endsWith('/') ? url.slice(0, -1) : url;
    this.tenant = tenant;
    this.database = database;
    this.client = axios.create({
      baseURL: this.base,
      headers: apiKey ? { 'X-API-Key': apiKey } : {},
    });
  }

  // List all collections in the database
  async listCollections() {
    const path = `/api/v2/tenants/${this.tenant}/databases/${this.database}/collections`;
    const res = await this.client.get(path);
    return res.data;
  }

  // Check if a collection exists by name
  async collectionExists(name) {
    const cols = await this.listCollections();
    return cols.some(c => (typeof c === 'string' ? c === name : c.name === name));
  }

  // Create a new collection with the given name
  async createCollection(name) {
    const path = `/api/v2/tenants/${this.tenant}/databases/${this.database}/collections`;
    await this.client.post(path, { name });
  }

  // Get the collection ID by its name
  async getCollectionIdByName(name) {
    const cols = await this.listCollections();
    const col = cols.find(c => c.name === name);
    console.log(`[ChromaConnector] Selected Collection ${name} and col ${col}`);
    if (!col) throw new Error(`Collection not found: ${name}`);
    return col.id;
  }

  // Query vectors in a collection by name
  async queryCollection(name, queryEmbeddings, options = {}) {
    const collectionId = await this.getCollectionIdByName(name);
    const path =
      `/api/v2/tenants/${this.tenant}/databases/${this.database}` +
      `/collections/${encodeURIComponent(collectionId)}/query`;
    const payload = {
      query_embeddings: queryEmbeddings,
      n_results: options.n_results || options.nResults || 10,
      include: options.include || ['documents', 'metadatas'],
    };
    console.log(`[ChromaConnector] POST ${path}`);
    console.log(`[ChromaConnector] Payload:`, JSON.stringify(payload));
    try {
      const res = await this.client.post(path, payload);
      console.log(`[ChromaConnector] Query response:`, JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      if (err.response) {
        console.error(`[ChromaConnector] Query error:`, err.response.status, err.response.data);
      } else {
        console.error(`[ChromaConnector] Query error:`, err.message);
      }
      throw err;
    }
  }

  // Add vectors to a collection by name
  async addVectors(name, vectors) {
    const collectionId = await this.getCollectionIdByName(name);
    const path =
      `/api/v2/tenants/${this.tenant}/databases/${this.database}` +
      `/collections/${encodeURIComponent(collectionId)}/add`;
    const payload = {
      ids: vectors.map(v => v.id),
      embeddings: vectors.map(v => v.embedding),
      metadatas: vectors.map(v => v.metadata || {}),
      documents: vectors.map(v => v.document || null),
    };
    console.log(`[ChromaConnector] POST ${path}`);
    console.log(`[ChromaConnector] Payload:`, JSON.stringify(payload));
    try {
      const res = await this.client.post(path, payload);
      console.log(`[ChromaConnector] Add response:`, JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      if (err.response) {
        console.error(`[ChromaConnector] Add error:`, err.response.status, err.response.data);
      } else {
        console.error(`[ChromaConnector] Add error:`, err.message);
      }
      throw err;
    }
  }

  // Get records from a collection by name
  async getCollectionRecords(name, options = {}) {
    // Remove 'ids' from include before sending to Chroma
    let include = options.include || ['documents', 'metadatas'];
    let includeIds = false;
    if (include.includes('ids')) {
      include = include.filter(i => i !== 'ids');
      includeIds = true;
    }
    const collectionId = await this.getCollectionIdByName(name);
    const path =
      `/api/v2/tenants/${this.tenant}/databases/${this.database}` +
      `/collections/${encodeURIComponent(collectionId)}/get`;
    const payload = {
      ids: options.ids || null,
      include,
      limit: options.limit || 10,
      offset: options.offset || 0,
      where: options.where || undefined,
      where_document: options.where_document || undefined
    };
    console.log(`[ChromaConnector] POST ${path}`);
    console.log(`[ChromaConnector] Payload:`, JSON.stringify(payload));
    try {
      const res = await this.client.post(path, payload);
      let data = res.data;
      // If user requested 'ids', add it to include in the response
      if (includeIds) {
        data.include = [...(data.include || []), 'ids'];
      }
      // Log only the latest record as a single object
      const lastIndex = (data.ids || data.documents || data.metadatas) && (
        (data.ids || data.documents || data.metadatas).length - 1
      );
      console.log(
        `[ChromaConnector] Latest record:`,
        JSON.stringify({
          id: data.ids?.[lastIndex],
          document: data.documents?.[lastIndex],
          metadata: data.metadatas?.[lastIndex]
        })
      );
      return data;
    } catch (err) {
      if (err.response) {
        console.error(`[ChromaConnector] Get error:`, err.response.status, err.response.data);
      } else {
        console.error(`[ChromaConnector] Get error:`, err.message);
      }
      throw err;
    }
  }

  // Update metadata of records in a collection by name
  async updateRecords(name, ids, metadatas) {
    const collectionId = await this.getCollectionIdByName(name);
    const path =
      `/api/v2/tenants/${this.tenant}/databases/${this.database}` +
      `/collections/${encodeURIComponent(collectionId)}/update`;
    
    const payload = {
      ids,
      metadatas
    };

    console.log(`[ChromaConnector] POST ${path}`);
    console.log(`[ChromaConnector] Update payload:`, JSON.stringify(payload));

    try {
      const res = await this.client.post(path, payload);
      console.log(`[ChromaConnector] Update response:`, JSON.stringify(res.data));
      return res.data;
    } catch (err) {
      if (err.response) {
        console.error(`[ChromaConnector] Update error:`, err.response.status, err.response.data);
      } else {
        console.error(`[ChromaConnector] Update error:`, err.message);
      }
      throw err;
    }
  }

  // Delete vectors from a collection by IDs
  async deleteVectors(name, ids) {
    const collectionId = await this.getCollectionIdByName(name);
    const path =
      `/api/v2/tenants/${this.tenant}/databases/${this.database}` +
      `/collections/${encodeURIComponent(collectionId)}/delete`;
    const payload = { ids };
    try {
      const res = await this.client.post(path, payload);
      return res.data;
    } catch (err) {
      if (err.response) {
        console.error(`[ChromaConnector] Delete error:`, err.response.status, err.response.data);
      } else {
        console.error(`[ChromaConnector] Delete error:`, err.message);
      }
      throw err;
    }
  }
}

module.exports = ChromaConnector;