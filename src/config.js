require('dotenv').config();

module.exports = {
  port: process.env.PORT || 16014,
  ollama: {
    url:   process.env.OLLAMA_API_URL || 'http://localhost:11434',
    apiKey: process.env.OLLAMA_API_KEY || ''
  },
  auth: {
    user: process.env.BASIC_AUTH_USER || '',
    pass: process.env.BASIC_AUTH_PASS || '',
    appToken: process.env.APP_TOKEN || ''
  },
  dbProvider: process.env.DB_PROVIDER,
  dbUrl:      process.env.DB_URL,
  dbApiKey:   process.env.DB_API_KEY,
};