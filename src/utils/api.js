// OllamaAPI provides methods to interact with the Ollama API, including chat, generation, model listing, and embeddings.
const axios = require('axios');
const cfg = require('../config');
const logger = require('./logger');

class OllamaAPI {
  constructor() {
    this.baseURL = cfg.ollama.url;
    this.apiKey = cfg.ollama.apiKey;
    logger.info(`OllamaAPI initialized with base URL: ${this.baseURL}`);
  }

  /**
   * Returns headers for API requests, including Authorization if apiKey is set.
   * @returns {object} Headers object
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };
  }

  /**
   * Handles HTTP requests to the Ollama API with error logging and context.
   * @param {object} config - Axios request config
   * @returns {Promise<object>} Axios response
   */
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

  /**
   * Calls the /api/generate endpoint to generate a response from a model.
   * @param {object} params - Generation parameters
   * @returns {Promise<object>} Axios response
   */
  async generate(params) {
    const useStream = params.stream !== undefined ? params.stream : true;
    return this.handleRequest({
      method: 'post',
      url: `${this.baseURL}/api/generate`,
      headers: this.getHeaders(),
      data: params,
      responseType: useStream ? 'stream' : 'json',
      timeout: 120000 // 2 minutes timeout
    });
  }

  /**
   * Calls the /api/chat endpoint for interactive chat with a model.
   * @param {object} params - Chat parameters
   * @returns {Promise<object>} Axios response
   */
  async chat(params) {
    const useStream = params.stream !== undefined ? params.stream : true;
    return this.handleRequest({
      method: 'post',
      url: `${this.baseURL}/api/chat`,
      headers: this.getHeaders(),
      data: params,
      responseType: useStream ? 'stream' : 'json',
      timeout: 120000 // 2 minutes timeout
    });
  }

  /**
   * Calls the /api/tags endpoint to list available models.
   * @returns {Promise<object>} Axios response
   */
  async getTags() {
    return this.handleRequest({
      method: 'get',
      url: `${this.baseURL}/api/tags`,
      headers: this.getHeaders(),
      responseType: 'json',
      timeout: 10000
    });
  }

  /**
   * Calls the /api/embeddings endpoint to create embeddings from input.
   * @param {object} params - Embedding parameters
   * @returns {Promise<object>} Axios response
   */
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