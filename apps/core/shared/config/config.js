// src/config.js
// Loads environment variables and exports application configuration.
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 16014,
  requestLimit: process.env.REQUEST_SIZE_LIMIT || '10mb', // Added configurable request size limit
  largePayloadThreshold: parseInt(process.env.LARGE_PAYLOAD_THRESHOLD) || 50000, // Default 50KB (increased from 10KB)
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
  dbTenant:      process.env.DB_TENANT,
  dbDatabase:    process.env.DB_DATABASE,
};