var async = require('async');

var request = require('util/request').request;
var testUtil = require('util/test');

exports['test_missing_auth_token'] = function(test, assert) {
  var options = {'return_response': true};

  options.headers = {'X-Tenant-Id': '1234'};
  request('http://127.0.0.1:9000', 'GET', null, options, function(err, response) {
    assert.ok(err);
    assert.equal(err.statusCode, 400);
    assert.match(JSON.parse(response.body).message, /Missing X-Auth-Token header/i);
    test.finish();
  });
};

exports['test_invalid_auth_token'] = function(test, assert) {
  var options = {'return_response': true};

  options.headers = {'X-Tenant-Id': '1234', 'X-Auth-Token': 'invalid'};
  request('http://127.0.0.1:9000', 'GET', null, options, function(err, response) {
    assert.ok(err);
    assert.equal(err.statusCode, 401);
    assert.match(JSON.parse(response.body).message, /invalid or expired authentication token/i);
    test.finish();
  });
};

exports['test_valid_auth_token'] = function(test, assert) {
  var options = {'return_response': true, 'expected_status_codes': [200]}, server = null, reqCount = 0;

  async.waterfall([
    function startBackendServer(callback) {
      testUtil.getTestHttpServer(9001, '127.0.0.1', function(_server) {
        server = _server;
        server.get('*', function(req, res) {
          reqCount++;
          res.writeHead(200, {});
          res.end();
        });

        callback();
      });
    },

    function issueRequest(callback) {
      options.headers = {'X-Tenant-Id': '7777', 'X-Auth-Token': 'dev'};
      request('http://127.0.0.1:9000', 'GET', null, options, function(err, res) {
        assert.ok(!err);
        assert.equal(res.statusCode, 200);
        callback();
      });
    }
  ],

  function(err) {
    if (server) {
      server.close();
    }

    assert.equal(reqCount, 1);
    test.finish();
  });
};
