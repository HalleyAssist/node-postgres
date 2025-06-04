const { getStream, getSecureStream } = getStreamFuncs()

module.exports = {
  /**
   * Get a socket stream compatible with the current runtime environment.
   * @returns {Duplex}
   */
  getStream,
  /**
   * Get a TLS secured socket, compatible with the current environment,
   * using the socket and other settings given in `options`.
   * @returns {Duplex}
   */
  getSecureStream,
}

/**
 * The stream functions that work in Node.js
 */
function getNodejsStreamFuncs() {
  function getStream(ssl) {
    const net = require('net')
    return new net.Socket()
  }

  function getSecureStream(options) {
    var tls = require('tls')
    return tls.connect(options)
  }
  return {
    getStream,
    getSecureStream,
  }
}

function getStreamFuncs() {
  return getNodejsStreamFuncs()
}
