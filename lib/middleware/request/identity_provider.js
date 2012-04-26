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

var httpUtil = require('../../util/http');

/**
 * Extraction regex for the Tenant ID inside the URL.
 * @type {RegExp}
 */
var TENANT_ID_REGEX = /\/(\d+)\/?/;


exports.processRequest = function(req, res, callback) {
  var tenantId = null;

  if (req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
  }
  else {
    rematch = TENANT_ID_REGEX.exec(req.url);

    if (rematch !== null && rematch[1]) {
      tenantId = rematch[1];
      req.headers['x-tenant-id'] = tenantId;
    }
  }

  req.userId = tenantId;
  callback();
};
