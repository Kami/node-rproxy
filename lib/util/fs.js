var fs = require('fs');
var path = require('path');

var async = require('async');

/**
 * Get files in a directory which match the provided name pattern.
 * Note: This function recurses into sub-directories.
 *
 * @param {String} directory Directory to search.
 * @param {String} matchPattern File name match pattern.
 * @param {Object} options Optional options object.
 * @param {Function} callback Callback called with (err, matchingFilePaths).
 */
exports.getMatchingFiles = function getMatchingFiles(directory, matchPattern, options, callback) {
  options = options || {};
  var matchedFiles = [],
      recurse = options.recurse || false;

  fs.readdir(directory, function(err, files) {
    if (err) {
      callback(null, matchedFiles);
      return;
    }

    async.forEach(files, function(file, callback) {
      var filePath = path.join(directory, file);
      fs.stat(filePath, function(err, stats) {
        if (err) {
          callback();
        }
        else if (stats.isDirectory() && recurse) {
          getMatchingFiles(filePath, matchPattern, options, callback);
        }
        else if (matchPattern.test(file)) {
          matchedFiles.push(filePath);
          callback();
        }
        else {
          callback();
        }
      });
    },

    function(err) {
      callback(err, matchedFiles);
    });
  });
};
