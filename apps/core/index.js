// Core application feature exports
module.exports = {
  auth: require('./features/auth'),
  database: require('./features/database'),
  health: require('./features/health'),
  ollama: require('./features/ollama'),
  monitoring: require('./features/monitoring'),
  tunneling: require('./features/tunneling'),
  
  // Shared utilities
  config: require('./shared/config/config'),
  utils: {
    api: require('./shared/utils/api'),
    logger: require('./shared/utils/logger'),
    dbFactory: require('./shared/utils/dbFactory'),
    dbEvents: require('./shared/utils/dbEvents')
  }
};
