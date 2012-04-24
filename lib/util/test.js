var express = require('express');

exports.getTestHttpServer = function(port, ip, callback) {
  ip = ip || '127.0.0.1';

  var server = express.createServer();
  server.listen(port, ip, callback.bind(server, server));
};
