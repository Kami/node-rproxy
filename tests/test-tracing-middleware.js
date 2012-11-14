var async = require('async');
var express = require('express');

var request = require('util/request').request;
var testUtil = require('util/test');

exports.test_tracing_request_and_response_middleware = function(test, assert) {
  var server1, server2, receivedTracesCount = 0;

  async.waterfall([
    function startBackendServer(callback) {
      testUtil.getTestHttpServer(9001, '127.0.0.1', function(err, _server) {
        server1 = _server;

        server1.get('/test', function(req, res) {
          // Make sure trace id is propagated to the backend
          assert.ok(req.headers.hasOwnProperty('x-b3-traceid'));
          assert.ok(req.headers.hasOwnProperty('x-b3-spanid'));
          assert.ok(req.headers.hasOwnProperty('x-b3-parentspanid'));

          res.writeHead(200, {});
          res.end();
        });

        callback();
      });
    },

    function startMockRESTkinServer(callback) {
      server2 = express.createServer();

      server2.use(express.bodyParser());
      server2.post('/11111/trace', function(req, res) {
        var trace = req.body[0], traceHeaders;

        receivedTracesCount++;

        if (receivedTracesCount === 1) {
          // First trace should have 7 annotations
          // 1. Server receive
          // 2. request url
          // 3. request headers
          // 4. request origin remote address
          // 5. user id
          // 5. response status code
          // 7. server send
          assert.equal(trace.annotations.length, 7);
          assert.equal(trace.annotations[0].key, 'sr');
          assert.equal(trace.annotations[1].key, 'http.uri');
          assert.equal(trace.annotations[2].key, 'http.request.headers');
          assert.equal(trace.annotations[3].key, 'http.request.remote_address');
          assert.equal(trace.annotations[4].key, 'rax.tenant_id');
          assert.equal(trace.annotations[5].key, 'http.response.code');
          assert.equal(trace.annotations[6].key, 'ss');

          // Verify that headers have been correctly sanitized
          traceHeaders = JSON.parse(trace.annotations[2].value);
          assert.ok(!traceHeaders.hasOwnProperty('foo'));
          assert.ok(!traceHeaders.hasOwnProperty('moo'));
          assert.ok(traceHeaders.hasOwnProperty('bar'));
        }
        else if (receivedTracesCount === 2) {
          assert.equal(trace.annotations[0].key, 'cs');
        }

        res.end();
      });

      server2.listen(4567, '127.0.0.1', callback);
    },

    function issueRequestSuccess(callback) {
      var options = {'return_response': true, 'expected_status_codes': [200],
                     'headers': {'foo': 'bar', 'bar': 'baz', 'mOO': 'ponies'} };

      request('http://127.0.0.1:9000/test', 'GET', null, options, function(err, res) {
        assert.equal(res.statusCode, 200);

        setTimeout(callback, 1500);
      });
    },

    function issueRequestRESTkinBackendIsDown(callback) {
      var options = {'return_response': true, 'expected_status_codes': [200],
                     'headers': {'foo': 'bar', 'bar': 'baz', 'mOO': 'ponies'}};

      server2.close();
      server2 = null;

      // RESTkin server being unavailable shouldn't result in service
      // interruption
      request('http://127.0.0.1:9000/test', 'GET', null, options, function(err, res) {
        assert.equal(res.statusCode, 200);

        setTimeout(callback, 1000);
      });
    }
  ],

  function(err) {
    if (server1) {
      server1.close();
    }

    if (server2) {
      server2.close();
    }

    // Should receive two traces - serverRecv, clientSend
    assert.equal(receivedTracesCount, 2);
    test.finish();
  });
};
