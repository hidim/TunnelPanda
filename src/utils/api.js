const axios = require('axios');
const cfg = require('../config');

class OllamaAPI {
  constructor() {
    this.baseURL = cfg.ollama.url;
    this.apiKey = cfg.ollama.apiKey;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
    };
  }

  // Generate endpoint
  async generate(params, stream = true) {
    return axios({
      method: 'post',
      url: `${this.baseURL}/api/generate`,
      headers: this.getHeaders(),
      data: { ...params, stream },
      responseType: 'stream'
    });
  }

  // Chat endpoint
  async chat(params, stream = true) {
    return axios({
      method: 'post',
      url: `${this.baseURL}/api/chat`,
      headers: this.getHeaders(),
      data: { ...params, stream },
      responseType: 'stream'
    });
  }

  // List models (tags)
  async getTags() {
    return axios({
      method: 'get',
      url: `${this.baseURL}/api/tags`,
      headers: this.getHeaders(),
      responseType: 'json'
    });
  }

  // Create embeddings
  async createEmbeddings(params) {
    return axios({
      method: 'post',
      url: `${this.baseURL}/api/embeddings`,
      headers: this.getHeaders(),
      data: params,
      responseType: 'json'
    });
  }
}

module.exports = new OllamaAPI();