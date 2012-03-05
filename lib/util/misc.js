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

/**
 * Very simple object merging.
 * Merges two or more objects together, returning the first object containing a
 * superset of all attributes.  There is a hiearchy of precedence starting with
 * left side and moving right.
 *
 * @return {Object} The merged object.
 */
exports.fullMerge = function() {
  var args = Array.prototype.slice.call(arguments),
      first,
      a,
      attrname,
      i, l;

  if (args.length < 2) {
    throw new Error('Incorrect use of the API, use at least two operands');
  }

  first = args[0];

  for (i = 1, l = args.length; i < l; i++) {
    a = args[i];
    for (attrname in a) {
      if (a.hasOwnProperty(attrname)) {
        first[attrname] = a[attrname];
      }
    }
  }
  return first;
};


/**
 * Very simple object merging.
 * Merges two objects together, returning a new object containing a
 * superset of all attributes.  Attributes in b are prefered if both
 * objects have identical keys.
 *
 * @param {Object} a Object to merge.
 * @param {Object} b Object to merge, wins on conflict.
 * @return {Object} The merged object.
 */
exports.merge = function(a, b) {
  return exports.fullMerge({}, a, b);
};


/**
 * Convert a date string to unix timestamp.
 *
 * @param {String} dateStr Date and time string.
 * @return {Number} Number of seconds since unix epoch.
 */
exports.dateStrToUnixTimestamp = function(dateStr) {
  return Math.round((Date.parse(dateStr) / 1000));
};
