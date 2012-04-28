#!/usr/bin/env node

var express = require('express');
var sprintf = require('sprintf').sprintf;

var argv = require('optimist')
  .usage('Usage: $0 -h [host] -p [port]')
  .default('h', 'localhost')
  .default('p', 8080)
  .argv;

function handleRequest(req, res) {
  res.writeHead(200, {});
  res.end('');
}

function run() {
  var server = express.createServer();

  server.get('*', handleRequest);
  server.post('*', handleRequest);
  server.put('*', handleRequest);
  server.del('*', handleRequest);

  server.listen(argv.p, argv.h);
  console.log('Server listening on %s:%s', argv.h, argv.p);
}

run();
