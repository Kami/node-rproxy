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
var log = require('logmagic').local('lib.middleware.rate_limiting');
var sprintf = require('sprintf').sprintf;

var client = require('../db').getClient();
var config = require('../util/config').config;
var misc = require('../util/misc');
var errors = require('../util/errors');
var httpUtil = require('../util/http');


/**
 * Cache of compiled regular expressions.
 * @type {Object}
 */
var REGEX_CACHE = {};


/**
 * Check and update user rate limits.
 *
 * @param {String} id user id.
 * @param {Object} rule Rate limiting rule.
 * @param {Function} callback Callback called with (err).
 */
function checkAndUpdateLimit(id, rule, callback) {
  var settings = config.middleware.rate_limiting.settings, currentUsage = 0;

  async.waterfall([
    function calculateBucketKeyNames(callback) {
      var now = misc.getUnixTimestamp(), keys = [], key, bucketCount, tmp, startTs;

      bucketCount = Math.floor((now / settings.bucket_size));
      tmp = Math.floor(rule.period / settings.bucket_size);
      startTs = Math.floor((bucketCount - tmp) * settings.bucket_size);
      endTs = (bucketCount * settings.bucket_size);

      for (ts = startTs; ts < endTs; ts = (ts + settings.bucket_size)) {
        key = sprintf('rate_limits:%s:%s_%s:%s', id, rule.path_regex, rule.period, ts);
        keys.push(key);
      }

      callback(null, keys);
    },

    function getCurrentUsage(keys, callback) {
      client.getMulti(keys, function(err, values) {
        var usage = 0, bucketNameToValueMap = {}, i, key, value;

        if (err) {
          callback(err);
          return;
        }

        for (i = 0; i < keys.length; i++) {
          key = keys[i];
          value = parseInt(values[i], 10);
          bucketNameToValueMap[key] = value || 0;

          if (value) {
            usage += value;
          }
        }

        currentUsage = usage;
        callback(null, keys, bucketNameToValueMap);
      });
    },

    function checkUsageAgainstLimit(keys, bucketNameToValueMap, callback) {
      if (currentUsage >= rule.limit) {
        log.debug('Limit has been reached', {'usage': currentUsage, 'limit': rule.limit});
        callback(new errors.RateLimitReachedError(rule));
        return;
      }

      callback(null, keys, bucketNameToValueMap);
    },

    function updateUsage(keys, bucketNameToValueMap, callback) {
      var currentBucketKey = keys[keys.length - 1], value = bucketNameToValueMap[currentBucketKey];
      // Update counter for the currently active bucket
      client.incr(currentBucketKey, {'step': 1, 'ttl': settings.bucket_size}, function(err) {
        if (err) {
          callback(err);
          return;
        }

        currentUsage++;
        callback(null);
      });
    }
  ],

  function(err) {
    callback(err, currentUsage);
  });
}


exports.processRequest = function(req, res, callback) {
  var settings = config.middleware.rate_limiting.settings, method = req.method, url = req.url,
      reachedLimitErrors = [], oldWriteHead = res.writeHead;

  if (!req.userId) {
    log.debug('User id not provided, skipping rate limiting...');
    callback();
    return;
  }

  // Inject usage / limits headers
  res.writeHead = function(code, headers) {
    var item;
    headers = headers || {};

    if (req.activeLimits.length >= 1) {
      req.activeLimits.sort(function(a, b) {
        return (a.available - b.available);
      });

      item = req.activeLimits[0];

      headers['X-Ratelimit-Path-Regex'] = item.regex;
      headers['X-Ratelimit-Limit'] = item.limit;
      headers['X-Ratelimit-Used'] = item.used;
      headers['X-Ratelimit-Window'] = item.period + ' seconds';
    }

    oldWriteHead.call(res, code, headers);
  };

  req.activeLimits = [];
  async.forEach(settings.limits, function(rule, callback) {
    var regex;

    if (!REGEX_CACHE.hasOwnProperty(rule.path_regex)) {
      REGEX_CACHE[rule.path_regex] = new RegExp(rule.path_regex);
    }

    regex = REGEX_CACHE[rule.path_regex];

    // TODO: More efficient based on the database backend
    if (rule.method === method && regex.test(url)) {
      log.debug('URL matches a rate limited path, updating and checking limits...',
                {'url': url, 'method': method, 'path_regex': rule.path_regex});

      checkAndUpdateLimit(req.userId, rule, function(err, used) {
        if (err && (err instanceof errors.RateLimitReachedError)) {
          reachedLimitErrors.push(err);
          err = null;
        }

        req.activeLimits.push({'regex': rule.path_regex, 'limit': rule.limit,
                               'period': rule.period, 'available': (rule.limit - used),
                               'used': used});

        callback(err);
      });
    }
    else {
      callback();
    }
  },

  function(err) {
    if (err) {
      httpUtil.returnError(res, 400, err.message);
    }

    if (reachedLimitErrors.length >= 1) {
      // TODO: Better, also return limit in the headers, etc
      err = reachedLimitErrors[0];
      httpUtil.returnError(res, 400, err.message);
    }

    callback(err);
  });
};
