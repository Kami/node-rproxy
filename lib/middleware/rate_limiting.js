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
var httpUtil = require('../util/http');


/**
 * Cache of compiled regular expressions.
 * @type {Object}
 */
var REGEX_CACHE = {};


function checkAndUpdateLimit(rule, callback) {
  var settings = config.middleware.rate_limiting.settings;

  async.waterfall([
    function calculateBucketKeyNames(callback) {
      var now = misc.getUnixTimestamp(), keys = [], key, bucketCount, tmp, startTs;

      bucketCount = Math.floor((now / settings.bucket_size));
      tmp = Math.floor(rule.period / settings.bucket_size);
      startTs = Math.floor((bucketCount - tmp) * settings.bucket_size);
      endTs = (bucketCount * settings.bucket_size);

      for (ts = startTs; ts < endTs; ts = (ts + settings.bucket_size)) {
        key = sprintf('rate_limits:%s_%s:%s', rule.path_regex, rule.period, ts);
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

        callback(null, usage, keys, bucketNameToValueMap);
      });
    },

    function checkUsageAgainstLimit(usage, keys, bucketNameToValueMap, callback) {
      if (usage >= rule.limit) {
        // TODO: Return usage in the headers, etc.
        log.debug('Limit has been reached', {'usage': usage, 'limit': rule.limit});
        callback(new Error('Limit has been reached'));
        return;
      }

      callback(null, keys, bucketNameToValueMap);
    },

    function updateUsage(keys, bucketNameToValueMap, callback) {
      var currentBucketKey = keys[keys.length - 1], value = bucketNameToValueMap[currentBucketKey];
      // Update counter for the currently active bucket
      client.set(currentBucketKey, value + 1, null, function(err) {
        if (err) {
          callback(err);
          return;
        }

        callback();
      });
    }
  ], callback);
}


exports.processRequest = function(req, res, callback) {
  var i, len, rule, method, url, key, regex;

  method = req.method;
  url = req.url;

  async.forEach(config.rate_limits, function(rule, callback) {
    if (!REGEX_CACHE.hasOwnProperty(rule.path_regex)) {
      REGEX_CACHE[rule.path_regex] = new RegExp(rule.path_regex);
    }

    regex = REGEX_CACHE[rule.path_regex];

    // TODO: More efficient based on the database backend
    if (rule.method === method && regex.test(url)) {
      log.debug('URL matches a rate limited path, checking limits...', {'url': 'url', 'method': method});
      checkAndUpdateLimit(rule, callback);
    }
    else {
      callback();
    }
  },

  function(err) {
    if (err) {
      // TODO: Better, also return limit in the headers, etc
      httpUtil.returnError(res, 400, err.message);
    }

    callback(err);
  });
};
