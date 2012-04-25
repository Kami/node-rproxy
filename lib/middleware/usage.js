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

var log = require('logmagic').local('lib.middleware.usage');

var config = require('../util/config').config;

exports.HEADER_KEY_NAMES = ['X-Usage-Resource-Id', 'X-Usage-Resource-Action', 'X-Usage-Resource-Data'];

exports.processRequest = function(req, res, callback) {
  var settings = config.middleware.usage.settings, oldWriteHead = res.writeHead;

  res.writeHead = function(code, headers) {
    var resourceId, action, data, writeHeadFunc;
    headers = headers || {};

    if (headers.hasOwnProperty(exports.HEADER_KEY_NAMES[0])) {
      id = headers[exports.HEADER_KEY_NAMES[0]];
      action = headers[exports.HEADER_KEY_NAMES[1]];
      data = headers[exports.HEADER_KEY_NAMES[2]];

      // This headers are never returned to the user
      HEADER_KEY_NAMES.forEach(function(key) {
        delete headers[key];
      });

      try {
        data = JSON.parse(data);
      }
      catch (err) {
        log.error('Failed to parse resource data', {'error': err});
        oldWriteHead.call(res, code, headers);
        return;
      }

      // TODO: Send to Atom Hopper
    }

    oldWriteHead.call(res, code, headers);
  };

  callback();
};
