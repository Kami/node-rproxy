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

var config = require('../util/config').config;


exports.processRequest = function(req, res, callback) {
  var i, len, item, method, url, key;

  method = req.method;
  url = req.url;

  // TODO: Compile regexs && more efficient lookups
  for (i = 0, leni = config.rate_limits.length; i < leni; i++) {
    item = config.rate_limits[i];

    if (item.method === method && new RegExp(item.path_regex).test(url)) {
      key = '%s:%s' % (key, req._tenantId);
    }
  }

  callback();
};
