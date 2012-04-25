var async = require('async');

var request = require('util/request').request;

exports.test_missing_tenant_id = function(test, assert) {
  var options = {'return_response': true};

  request('http://127.0.0.1:9000', 'GET', null, options, function(err, response) {
    assert.ok(err);
    assert.equal(err.statusCode, 400);
    assert.match(JSON.parse(response.body).message, /Missing X-Tenant-Id header/i);
    test.finish();
  });
};
