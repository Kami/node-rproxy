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

var os = require('os');
var path = require('path');

var Cluster = require('cluster2');
var httpProxy = require('http-proxy');
var async = require('async');
var log = require('logmagic').local('lib.server');

var constants = require('./../constants');
var fsUtil = require('./../util/fs');
var ProxyError = require('./../util/errors').ProxyError;


/**
 * Reverse proxy server.
 *
 * @param {Object} options Options object.
 */
function ReverseProxyServer(options) {
  this._options = options;
  this._server = httpProxy.createServer(this.processRequest.bind(this));

  this._middleware = {'request': {}, 'response': {}};
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
 * Load and register all the configured middleware.
 *
 * @param {Function} callback Callback called when all the modules have been
 * loaded.
 */
ReverseProxyServer.prototype._loadMiddleware = function(callback) {
  var self = this;

  async.waterfall([
    function getFiles(callback) {
      async.parallel([
        fsUtil.getMatchingFiles.bind(null, constants.REQUEST_MIDDLEWARE_PATH, /\.js$/, {}),
        fsUtil.getMatchingFiles.bind(null, constants.RESPONSE_MIDDLEWARE_PATH, /\.js$/, {})
      ],

      function(err, result) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, {'request': result[0], 'response': result[1]});
      });
    },

    function load(paths, callback) {
      async.parallel([
        function loadRequestMiddleware(callback) {
          async.forEach(paths.request, self._loadAndRegisterMiddleware.bind(self, 'request'), callback);

        },

        function loadResponseMiddleware(callback) {
          async.forEach(paths.response, self._loadAndRegisterMiddleware.bind(self, 'response'), callback);
        }
      ],

      function() {
        callback();
      });
    }
  ], callback);
};


ReverseProxyServer.prototype._loadAndRegisterMiddleware = function(type, filePath, callback) {
  var moduleName, module, requiredFunctionName;

  if (type === 'request') {
    requiredFunctionName = 'processRequest';
  }
  else if (type === 'response') {
    requiredFunctionName = 'processResponse';
  }
  else {
    throw new Error('Invalid middleware type: ' + type);
  }

  moduleName = path.basename(filePath).replace(/\.js$/, '');

  try {
    module = require(filePath);
  }
  catch (e) {
    log.errorf('Failed to load ${type} middleware "${module}": ' + e.toString(), {'type': type, 'module': moduleName});
    callback();
    return;
  }

  if (!module.hasOwnProperty(requiredFunctionName)) {
    log.errorf('Module "${module}" is missing "${name}" function, ignoring...',
               {'name': requiredFunctionName, 'module': moduleName});
    callback();
    return;
  }

  this._middleware[type][moduleName] = module;

  log.infof('Sucesfully loaded module "${module}"', {'module': moduleName});
  callback();
};


ReverseProxyServer.prototype.processRequest = function(req, res, proxy) {
  var self = this, i, len, name, dependencies, func, buffer = httpProxy.buffer(req),
      oldWriteHead = res.writeHead, opsRequest = {}, opsResponse = {},
      proxyOptions = {'host': this._options.target.host, 'port': this._options.target.port, 'buffer': buffer};

  log.debug('Received request', {'url': req.url, 'headers': req.headers});

  // TODO: Don't build the list on every request
  for (i = 0, len = this._options.target.middleware_run_list.request.length; i < len; i++) {
    name = this._options.target.middleware_run_list.request[i];
    dependencies = this._middleware.request[name].dependencies || [];
    func = this._middleware.request[name].processRequest.bind(null, req, res);

    if (dependencies.length === 0) {
      opsRequest[name] = func;
    }
    else {
      opsRequest[name] = dependencies.concat([func]);
    }
  }

  // TODO: Don't build the list on every request
  for (i = 0, len = this._options.target.middleware_run_list.response.length; i < len; i++) {
    name = this._options.target.middleware_run_list.response[i];
    dependencies = this._middleware.response[name].dependencies || [];
    func = this._middleware.response[name].processResponse.bind(null, req, res);

    if (dependencies.length === 0) {
      opsResponse[name] = func;
    }
    else {
      opsResponse[name] = dependencies.concat([func]);
    }
  }

  // Hacky MVPish way to detect when backend has sent the response
  // TODO: fork http-proxy and add better support to it
  res.writeHead = function(code, headers) {
    res.statusCode = code;
    res.headers = headers || {};

    async.auto(opsResponse, function(err) {
      oldWriteHead.call(res, code, res.headers);
    });
  };

  async.auto(opsRequest, function(err) {
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
  var self = this, cluster,
      workers = self._options.server.workers || os.cpus().length;

  if (workers > 1) {
    cluster = new Cluster({'port': port, 'noWorkers': workers});
    cluster.listen(function(cb) {
      cb(self._server);
      callback();
    });

    process.on('exit', function(code) {
      cluster.shutdown();
    });
  }
  else {
    this._server.listen(port, host, callback);
  }
};


exports.ReverseProxyServer = ReverseProxyServer;
