var util = require('util');


/**
 * UnexpectedStatusCodeError class.
 *
 * @constructor
 * @param {Array} expectedStatusCodes Expected status code.
 * @param {Number} actualStatusCode Actual status code.
 */
function UnexpectedStatusCodeError(expectedStatusCodes, actualStatusCode) {
  var msg = sprintf('Unexpected status code "%s". Expected one of: %s', actualStatusCode,
                    expectedStatusCodes.join(', '));

  this.expectedStatusCodes = expectedStatusCodes;
  this.statusCode = actualStatusCode;
  this.message = msg;
  Error.call(this, msg);
  Error.captureStackTrace(this, this.constructor);
}

util.inherits(UnexpectedStatusCodeError, Error);


/** UnexpectedStatusCodeError class. */
exports.UnexpectedStatusCodeError = UnexpectedStatusCodeError;
