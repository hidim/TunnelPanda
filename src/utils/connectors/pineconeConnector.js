class PineconeConnector {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Deletes vectors from a collection by IDs.
   * @param {string} name - Collection name
   * @param {Array} ids - Array of vector IDs to delete
   * @returns {Promise<void>} Resolves when deletion is complete.
   */
  deleteVectors(name, ids) {
    // This method should be implemented by each connector.
    throw new Error('deleteVectors not implemented for this connector');
  }
}

module.exports = PineconeConnector;