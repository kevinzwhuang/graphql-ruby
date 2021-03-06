/**
 * Given a map of { name => alias } pairs,
 * generate a JavaScript module that that
 * takes names as input and returns the alias.
 * @param {String} clientName - the client ID that this map belongs to
 * @param {Object} nameToAlias - `name => alias` pairs
 * @return {String} generated JS code
*/
function generateMap(clientName, nameToAlias) {
  if (!clientName) {
    throw new Error("Client name is required to generate a persisted alias lookup map")
  }
  // Build up the map
  var keyValuePairs = "{"
  var operationName
  for (operationName in nameToAlias) {
    persistedAlias = nameToAlias[operationName]
    keyValuePairs += "\n  \"" + operationName + "\": \"" + persistedAlias + "\","
  }
  keyValuePairs += "\n}"

  // Insert the map, plus a function to fetch values from it
  var javaScriptCode = `/**
 * Generated by graphql-ruby-client
 *
*/

/**
 * Map local operation names to persisted keys on the server
 * @return {Object}
 * @private
*/
var _aliases = ${keyValuePairs}

/**
 * The client who synced these operations with the server
 * @return {String}
 * @private
*/
var _client = "${clientName}"

var OperationStoreClient = {
  /**
   * Build a string for \`params[:operationId]\`
   * @param {String} operationName
   * @return {String} stored operation ID
  */
  getOperationId: function(operationName) {
    return _client + "/" + OperationStoreClient.getPersistedQueryAlias(operationName)
  },

  /**
   * Fetch a persisted alias from a local operation name
   * @param {String} operationName
   * @return {String} persisted alias
  */
  getPersistedQueryAlias: function(operationName) {
    var persistedAlias = _aliases[operationName]
    if (!persistedAlias) {
      throw new Error("Failed to find persisted alias for operation name: " + operationName)
    } else {
      return persistedAlias
    }
  },

  /**
   * Satisfy the Apollo middleware API.
   * Replace the query with an operationId
  */
  apolloMiddleware: {
    applyBatchMiddleware: function(options, next) {
      options.requests.forEach(function(req) {
        // Fetch the persisted alias for this operation
        req.operationId = OperationStoreClient.getOperationId(req.operationName)
        // Remove the now-unused query string
        delete req.query
        return req
      })
      // Continue the request
      next()
    },

    applyMiddleware: function(options, next) {
      var req = options.request
      // Fetch the persisted alias for this operation
      req.operationId = OperationStoreClient.getOperationId(req.operationName)
      // Remove the now-unused query string
      delete req.query
      // Continue the request
      next()
    }
  }
}

module.exports = OperationStoreClient
`

  return javaScriptCode
}

module.exports = generateMap
