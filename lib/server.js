var path = require('path');

var httpProxy = require('http-proxy');
var async = require('async');
var log = require('logmagic').local('lib.server');

var constants = require('./constants');
var fsUtil = require('./util/fs');


/**
 * Reverse proxy server.
 *
 * @param {Object} options Options object.
 */
function ReverseProxyServer(options) {
  this._options = options;
  this._server = httpProxy.createServer(this.processRequest.bind(this));

  this._proxyOptions = {'host': this._options.target.host, 'port': this._options.target.port};
  this._middleware = {};
}


/**
 * Run the server.
 *
 * @param {Function} callback Callback called when the server has been started
 * and bound to the port.
 */
ReverseProxyServer.prototype.run = function(callback) {
  var self = this;

  async.waterfall([
    this._initialize.bind(this),
    this._listen.bind(this, this._options.server.host, this._options.server.port)
  ],

  function(err) {
    if (err) {
      log.errorf('Failed to start the server: ${err}', {'err': err});
    }
    else {
      log.infof('Server listening on ${host}:${port}',
                {'host': self._options.server.host, 'port': self._options.server.port});
    }

    callback(err);
  });
};


ReverseProxyServer.prototype._initialize = function(callback) {
  async.waterfall([
    this._loadMiddleware.bind(this)
  ], callback);
};


/**
 * Load and register all the set up middleware.
 *
 * @param {Function} callback Callback called when all the modules have been
 * loaded.
 */
ReverseProxyServer.prototype._loadMiddleware = function(callback) {
  var self = this;

  async.waterfall([
    fsUtil.getMatchingFiles.bind(null, constants.MIDDLEWARE_PATH, /\.js$/, {}),

    function load(filePaths, callback) {
      async.forEach(filePaths, self._loadAndRegisterMiddleware.bind(self),
                    callback);
    }
  ], callback);
};


ReverseProxyServer.prototype._loadAndRegisterMiddleware = function(filePath, callback) {
  var moduleName, module;

  moduleName = path.basename(filePath).replace(/\.js$/, '');

  try {
    module = require(filePath);
  }
  catch (e) {
    log.errorf('Failed to load middleware "${module}": ' + e.toString(), {'module': moduleName});
    callback();
    return;
  }

  if (!module.hasOwnProperty('processRequest')) {
    log.errorf('Module "${module}" is missing "processRequest" function, ignoring...', {'module': moduleName});
    callback();
    return;
  }

  this._middleware[moduleName] = module;

  log.infof('Sucesfully loaded module "${module}"', {'module': moduleName});
  callback();
};


ReverseProxyServer.prototype.processRequest = function(req, res) {
  this._server.proxyRequest(req, res, this._proxyOptions);
};


ReverseProxyServer.prototype._listen = function(host, port, callback) {
  this._server.listen(port, host, callback || function() {});
};


exports.ReverseProxyServer = ReverseProxyServer;
