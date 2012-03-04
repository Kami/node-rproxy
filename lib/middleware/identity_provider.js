/**
 * Extraction regex for the Tenant ID inside the URL.
 * @type {RegExp}
 */
var TENANT_ID_REGEX = /\/(\d+)\/?/;


exports.processRequest = function(req, res, callback) {
  var tenantId;

  if (req.headers['x-tenant-id']) {
    tenantId = req.headers['x-tenant-id'];
  }
  else {
    rematch = TENANT_ID_REGEX.exec(req.url);

    if (rematch !== null && rematch[1]) {
      tenantId = rematch[1];
    }
    else {
      res.writeHead(401, {'Content-Type': 'text/plain'});
      res.end('No tenant id provided');
      callback(new Error('No tenant id provided'));
      return;
    }
  }

  req._tenantId = tenantId;

  callback();
};
