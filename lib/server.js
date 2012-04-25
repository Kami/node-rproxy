/**
 *  Copyright 2012 Tomaz Muraus
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

var path = require('path');

var httpProxy = require('http-proxy');
var async = require('async');
var log = require('logmagic').local('lib.server');

var constants = require('./constants');
var fsUtil = require('./util/fs');
var ProxyError = require('./util/errors').ProxyError;


/**
 * Reverse proxy server.
 *
 * @param {Object} options Options object.
 */
function ReverseProxyServer(options) {
  this._options = options;
  this._server = httpProxy.createServer(this.processRequest.bind(this));

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


ReverseProxyServer.prototype.processRequest = function(req, res, proxy) {
  var self = this,
      ops = {}, i, len, name, dependencies, func,
      buffer = httpProxy.buffer(req),
      proxyOptions = {'host': this._options.target.host, 'port': this._options.target.port, 'buffer': buffer};


  log.debug('Received request', {'url': req.url, 'headers': req.headers});

  // TODO: Don't build the list on every request
  for (i = 0, len = this._options.target.middleware_run_list.length; i < len; i++) {
    name = this._options.target.middleware_run_list[i];
    dependencies = this._options.middleware[name].depends || [];
    func = this._middleware[name].processRequest.bind(null, req, res);

    if (dependencies.length === 0) {
      ops[name] = func;
    }
    else {
      ops[name] = dependencies.concat([func]);
    }
  }

  async.auto(ops, function(err) {
    if (err) {
      log.error('Middleware returned an error, sending special headers to the backend...', {'error': err});

      if (err instanceof ProxyError) {
        req.headers['X-RP-Error-Code'] = err.code;
      }
      else {
        req.headers['X-RP-Error-Code'] = 'NR-5000';
      }

      req.headers['X-RP-Error-Message'] = err.message;
    }

    log.debug('Proxying request to the worker...', {'url': req.url, 'headers': req.headers,
                                                    'worker_host': self._options.target.host,
                                                    'worker_port': self._options.target.port});
    proxy.proxyRequest(req, res, proxyOptions);
  });
};


ReverseProxyServer.prototype._listen = function(host, port, callback) {
  this._server.listen(port, host, callback || function() {});
};


exports.ReverseProxyServer = ReverseProxyServer;
