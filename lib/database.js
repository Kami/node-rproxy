var redis = require('redis');

var config = require('./util/config').config;


exports.getClient = function getClient() {
  var client = redis.createClient(config.database.port, config.database.host);

  if (client) {
    client.auth(config.database.password);
  }

  return client;
};
