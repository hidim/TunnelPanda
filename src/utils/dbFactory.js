const config = require('../config');

// HTTP tabanlı connector’lar
const ChromaConnector   = require('./connectors/chromaConnector');
const MilvusConnector   = require('./connectors/milvusConnector');
const PineconeConnector = require('./connectors/pineconeConnector');

const SqliteConnector    = require('./connectors/sqliteConnector');
const RedisConnector     = require('./connectors/redisConnector');
const PostgresConnector  = require('./connectors/postgresConnector');
const MysqlConnector     = require('./connectors/mysqlConnector');

function getDbClient() {
  const url   = config.dbUrl;
  const proto = url.split(':')[0];

  switch (proto) {
    // --- HTTP tabanlı vector DB’ler ---
    case 'http':
    case 'https': {
      const providers = {
        chroma: ChromaConnector,
        milvus: MilvusConnector,
        pinecone: PineconeConnector,
        // qdrant: QdrantConnector,
      };
      const ProviderClass = providers[config.dbProvider];
      if (!ProviderClass) {
        throw new Error(`Desteklenmeyen HTTP DB sağlayıcısı: ${config.dbProvider}`);
      }
      return new ProviderClass({ url, apiKey: config.dbApiKey });
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