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
