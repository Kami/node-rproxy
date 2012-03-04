var fs = require('fs');

var log = require('logmagic').local('lib.util.config');

exports.config = {};


exports.loadConfig = function loadConfig(configPath) {
  var content = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  exports.config = content;
  return exports.config;
}
