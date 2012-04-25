var async = require('async');

var request = require('util/request').request;
var misc = require('util/misc');
var testUtil = require('util/test');
var usageMiddleware = require('middleware/usage');

function notInObject(assert, obj, items) {
  items.forEach(function(item) {
    assert.ok(!obj.hasOwnProperty(item));
  });
}

exports.test_usage_middleware = function(test, assert) {
  var entityData = {'id': 'a', 'name': 'test', 'ip': '127.0.0.1'},
      baseHeaders = {'Content-Type': 'application/json', 'X-Usage-Resource-Id': 'a',
                     'X-Usage-Resource-Name': 'entity', 'X-Usage-Resource-Data': JSON.stringify(entityData)},
      options = {'return_response': true, 'expected_status_codes': [200]}, server = null, headerNames;

  options.headers = {'X-Tenant-Id': '7777', 'X-Auth-Token': 'dev'};
  headerNames = usageMiddleware.HEADER_KEY_NAMES.map(function(name) { return name.toLowerCase(); });
  async.waterfall([
    function startBackendServer(callback) {
      testUtil.getTestHttpServer(9001, '127.0.0.1', function(_server) {
        server = _server;

        server.post('/entity/a', function(req, res) {
          var headers = misc.merge(baseHeaders, {'X-Usage-Resource-Action': 'create'});
          res.writeHead(201, headers);
          res.end();
        });

        server.put('/entity/a', function(req, res) {
          var headers = misc.merge(baseHeaders, {'X-Usage-Resource-Action': 'put'});
          res.writeHead(204, headers);
          res.end();
        });

        server.del('/entity/a', function(req, res) {
          var headers = misc.merge(baseHeaders, {'X-Usage-Resource-Action': 'delete'});
          res.writeHead(204, headers);
          res.end();
        });

        server.post('/entity/corrupted', function(req, res) {
          var headers = misc.merge(baseHeaders, {'X-Usage-Resource-Data': '{"broken json}'});
          res.writeHead(201, headers);
          res.end();
        });

        callback();
      });
    },

    function issueCreateRequest(callback) {
      // Verify that headers have been stripped
      request('http://127.0.0.1:9000/entity/a', 'POST', null, options, function(err, res) {
        notInObject(assert, res.headers, headerNames);
        assert.equal(res.statusCode, 201);
        callback();
      });
    },

    function issueUpdateRequest(callback) {
      // Verify that headers have been stripped
      request('http://127.0.0.1:9000/entity/a', 'PUT', null, options, function(err, res) {
        notInObject(assert, res.headers, headerNames);
        assert.equal(res.statusCode, 204);
        callback();
      });
    },

    function issueDeleteRequest(callback) {
      // Verify that headers have been stripped
      request('http://127.0.0.1:9000/entity/a', 'DELETE', null, options, function(err, res) {
        notInObject(assert, res.headers, headerNames);
        assert.equal(res.statusCode, 204);
        callback();
      });
    },

    function issueCreateRequest(callback) {
      // Verify that headers have been stripped
      request('http://127.0.0.1:9000/entity/corrupted', 'POST', null, options, function(err, res) {
        notInObject(assert, res.headers, headerNames);
        assert.equal(res.statusCode, 201);
        callback();
      });
    }
  ],

  function(err) {
    if (server) {
      server.close();
    }

    test.finish();
  });
};
