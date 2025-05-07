const axios = require('axios');
const cfg = require('../config');
const logger = require('./logger');

class OllamaAPI {
  constructor() {
    this.baseURL = cfg.ollama.url;
    this.apiKey = cfg.ollama.apiKey;
    logger.info(`OllamaAPI initialized with base URL: ${this.baseURL}`);
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };
  }

  async handleRequest(config) {
    try {
      logger.info(`Making request to ${config.url}`);
      const response = await axios(config);
      return response;
    } catch (error) {
      logger.error('Ollama API Error:', {
        url: config.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data
      });
      
      // Rethrow with more context
      throw {
        message: 'Ollama API Error',
        status: error.response?.status || 500,
        details: error.response?.data || error.message,
        originalError: error
      };
    }
  }

  // Generate endpoint
  async generate(params) {
    const useStream = params.stream !== undefined ? params.stream : true;
    return this.handleRequest({
      method: 'post',
      url: `${this.baseURL}/api/generate`,
      headers: this.getHeaders(),
      data: params,
      responseType: useStream ? 'stream' : 'json',
      timeout: 30000 // 30 second timeout
    });
  }

  // Chat endpoint
  async chat(params) {
    const useStream = params.stream !== undefined ? params.stream : true;
    return this.handleRequest({
      method: 'post',
      url: `${this.baseURL}/api/chat`,
      headers: this.getHeaders(),
      data: params,
      responseType: useStream ? 'stream' : 'json',
      timeout: 30000
    });
  }

  // List models (tags)
  async getTags() {
    return this.handleRequest({
      method: 'get',
      url: `${this.baseURL}/api/tags`,
      headers: this.getHeaders(),
      responseType: 'json',
      timeout: 10000
    });
  }

  // Create embeddings
  async createEmbeddings(params) {
    return this.handleRequest({
      method: 'post',
      url: `${this.baseURL}/api/embeddings`,
      headers: this.getHeaders(),
      data: params,
      responseType: 'json',
      timeout: 30000
    });
  }
}

module.exports = new OllamaAPI();