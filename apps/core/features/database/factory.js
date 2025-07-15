// src/utils/dbFactory.js
// Factory function to return the appropriate database client based on configuration.
// Supports HTTP-based and file/SDK-based vector database connectors.

const config = require('../config');

// HTTP-based connectors
const ChromaConnector   = require('./connectors/chromaConnector');
const MilvusConnector   = require('./connectors/milvusConnector');
const PineconeConnector = require('./connectors/pineconeConnector');

// File/SDK-based connectors
const SqliteConnector    = require('./connectors/sqliteConnector');
const RedisConnector     = require('./connectors/redisConnector');
const PostgresConnector  = require('./connectors/postgresConnector');
const MysqlConnector     = require('./connectors/mysqlConnector');

/**
 * Returns a database client instance based on configuration or provided options.
 *
 * @param {object} [options] - Optional overrides for tenant and database.
 * @param {string} [options.tenant]    Tenant name (override)
 * @param {string} [options.database]  Database name (override)
 * @returns {object} Database client instance
 */
function getDbClient(options = {}) {
  const url      = config.dbUrl;
  const proto    = url.split(':')[0];
  const tenant   = options.tenant   || config.dbTenant;
  const database = options.database || config.dbDatabase;

  switch (proto) {
    // --- HTTP-based vector databases ---
    case 'http':
    case 'https': {
      const providers = {
        chroma:   ChromaConnector,
        milvus:   MilvusConnector,
        pinecone: PineconeConnector,
        // qdrant: QdrantConnector,
      };
      const ProviderClass = providers[config.dbProvider];
      if (!ProviderClass) {
        throw new Error(`Unsupported HTTP database provider: ${config.dbProvider}`);
      }
      // Pass tenant and database to the constructor
      return new ProviderClass({
        url,
        apiKey:   config.dbApiKey,
        tenant,
        database,
      });
    }

    // --- SQLite (local file-based database) ---
    case 'sqlite': {
      // Example: sqlite:///path/to/db.sqlite
      const filePath = url.replace('sqlite://', '');
      return new SqliteConnector({ filePath });
    }

    // --- Redis (in-memory database) ---
    case 'redis': {
      return new RedisConnector({ connectionString: url });
    }

    // --- PostgreSQL (relational database) ---
    case 'postgres': {
      return new PostgresConnector({ connectionString: url });
    }

    // --- MySQL (relational database) ---
    case 'mysql': {
      return new MysqlConnector({ connectionString: url });
    }

    default:
      throw new Error(`Unsupported database protocol: ${proto}`);
  }
}

/**
 * Deletes vectors from a collection by IDs.
 * @param {string} collection - Collection name
 * @param {Array} ids - Array of vector IDs to delete
 * @returns {Promise<void>} Resolves when deletion is complete.
 */
function deleteVectors(collection, ids) {
  const db = getDbClient();
  return db.deleteVectors(collection, ids);
}

module.exports = { getDbClient, deleteVectors };