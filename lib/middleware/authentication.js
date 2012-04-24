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

var async = require('async');
var log = require('logmagic').local('lib.middleware.authentication');
var sprintf = require('sprintf').sprintf;

var client = require('../db').getClient();
var config = require('../util/config').config;
var request = require('../util/request').request;
var misc = require('../util/misc');
var httpUtil = require('../util/http');
var KeystoneClient = require('../util/keystone_client').KeystoneClient;



/**
 * Middleware for authenticating against the Rackspace Cloud Auth API.
 *
 * If a valid token is provided is also cached in Redis until it expires.
 */

function cacheToken(cacheKey, tenantId, token, expires, callback) {
  var expiresTs = misc.dateStrToUnixTimestamp(expires),
      nowTs = new Date().getTime() / 1000,
      ttl = Math.round((expiresTs - nowTs)),
      data = {
        'token': token,
        'tenantId': tenantId
      };

  if (ttl < 1) {
    log.debug('Token already expired, not caching it...');
    callback();
    return;
  }

  log.debug('Caching new auth token', {'tenantId': tenantId, 'expires': expires, 'ttl': ttl});
  client.set(cacheKey, data, {'ttl': ttl}, callback);
}

function verifyToken(tenantId, token, callback) {
  var settings = config.middleware.authentication.settings,
      clientOptions = {'username': settings.username, 'password': settings.password},
      clientParams, result = {};

  clientParams = settings.urls.map(function(url)  {
    return {'url': url, 'options': clientOptions};
  });

  async.some(clientParams, function(params, callback) {
    var client = new KeystoneClient(params.url, params.options);

    client.validateTokenForTenant(tenantId, token, function(err, data) {
      if (err) {
        log.error('Auth service returned an error', {'url': params.url, 'err': err});
        callback(false);
        return;
      }

      if (!err && data) {
        log.debug('Auth service returned that a token is valid', {'url': params.url});
        result.username = data.token.tenant.id;
        result.expires = data.token.expires;
        callback(true);
      }
    });
  },

  function(valid) {
    if (!valid) {
      callback(new Error('invalid or expired authentication token'));
      return;
    }

    callback(null, result);
  });
}


exports.processRequest = function(req, res, callback) {
  var tenantId = req._tenantId, token = req.headers['x-auth-token'], cacheKey;

  if (!token) {
    httpUtil.returnError(res, 400, 'Missing X-Auth-Token header');
    callback(new Error('No authentication token provided'));
    return;
  }

  cacheKey = 'auth-token-' + token + '-' + tenantId;

  async.waterfall([
    function getTokenFromCache(callback) {
      client.get(cacheKey, callback);
    },

    function maybeVerifyToken(data, callback) {
      if (data) {
        log.debug('Token already in the cache, skipping verification via API server...');
        callback(null, null);
        return;
      }

      log.debug('Token not in cache, verifying it against the keystone API...');
      verifyToken(tenantId, token, callback);
    },

    function maybeCacheToken(result, callback) {
      if (!result) {
        // Token is already in the cache.
        callback();
        return;
      }

      cacheToken(cacheKey, tenantId, token, result.expires, callback);
    }
  ],

  function(err) {
    if (err) {
      httpUtil.returnError(res, 401, err.message);
    }

    callback(err);
  });
};
