var express = require('express');

var PROXY_ERROR_CODE_TO_HTTP_CODE_MAP = {
  'NR-1000': 400,
  'NR-1001': 400,
  'NR-1002': 401
};

exports.getTestHttpServer = function(port, ip, callback) {
  ip = ip || '127.0.0.1';

  var server = express.createServer();
  server.listen(port, ip, function(err) {
    callback(err, server);
  });
};

exports.setupErrorEchoHandlers = function(server) {
  function echoError(req, res) {
    var code;

    if (!req.headers.hasOwnProperty('x-rp-error-code')) {
      res.writeHead(404, {});
      res.end();
      return;
    }

    code = PROXY_ERROR_CODE_TO_HTTP_CODE_MAP[req.headers['x-rp-error-code']];

    res.writeHead(code, {});
    res.end(req.headers['x-rp-error-message']);
  }

  server.get('*', echoError);
  server.post('*', echoError);
  server.put('*', echoError);
};
