// src/utils/dbFactory.js

const config = require('../config');

// HTTP tabanlı connector’lar
const ChromaConnector   = require('./connectors/chromaConnector');
const MilvusConnector   = require('./connectors/milvusConnector');
const PineconeConnector = require('./connectors/pineconeConnector');

// Dosya/SDK tabanlı connector’lar
const SqliteConnector    = require('./connectors/sqliteConnector');
const RedisConnector     = require('./connectors/redisConnector');
const PostgresConnector  = require('./connectors/postgresConnector');
const MysqlConnector     = require('./connectors/mysqlConnector');

 /**
  * getDbClient optsiyonel olarak tenant ve database alır;
  * yoksa .env üzerinden okunmuş config değerlerini kullanır.
  *
  * @param {object} [options]
  * @param {string} [options.tenant]    Tenant adı (override)
  * @param {string} [options.database]  Database adı (override)
  */
function getDbClient(options = {}) {
  const url      = config.dbUrl;
  const proto    = url.split(':')[0];
  const tenant   = options.tenant   || config.dbTenant;
  const database = options.database || config.dbDatabase;

  switch (proto) {
    // --- HTTP tabanlı vector DB’ler ---
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
        throw new Error(`Desteklenmeyen HTTP DB sağlayıcısı: ${config.dbProvider}`);
      }
      // tenant ve database’i de ctor’a geçiyoruz
      return new ProviderClass({
        url,
        apiKey:   config.dbApiKey,
        tenant,
        database,
      });
    }

    // --- SQLite (lokal dosya) ---
    case 'sqlite': {
      // Örn: sqlite:///path/to/db.sqlite
      const filePath = url.replace('sqlite://', '');
      return new SqliteConnector({ filePath });
    }

    // --- Redis ---
    case 'redis': {
      return new RedisConnector({ connectionString: url });
    }

    // --- PostgreSQL ---
    case 'postgres': {
      return new PostgresConnector({ connectionString: url });
    }

    // --- MySQL ---
    case 'mysql': {
      return new MysqlConnector({ connectionString: url });
    }

    default:
      throw new Error(`Desteklenmeyen DB protokolü: ${proto}`);
  }
}

module.exports = { getDbClient };