require('dotenv').config();

module.exports = {
  ollama: {
    url:   process.env.OLLAMA_API_URL || 'http://localhost:11434',
    apiKey: process.env.OLLAMA_API_KEY || ''
  },
  auth: {
    appToken: process.env.APP_TOKEN || ''
  }
};