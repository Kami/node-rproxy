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

exports.dependencies = [];

exports.processResponse = function(req, res, callback) {
  // Inject usage / limits headers
  if (req.activeLimits && req.activeLimits.length >= 1) {
    req.activeLimits.sort(function(a, b) {
      return (a.available - b.available);
    });

    item = req.activeLimits[0];

    res.headers['X-Ratelimit-Path-Regex'] = item.regex;
    res.headers['X-Ratelimit-Limit'] = item.limit;
    res.headers['X-Ratelimit-Used'] = item.used;
    res.headers['X-Ratelimit-Window'] = item.period + ' seconds';
  }

  callback();
};
