A reverse proxy thing.

# Features

* Authentication via the Keystone API
* Flexible rate limiting based on the source IP address
* Supported database backends
  * Redis
  * Cassandra

# Requirements

- Node.js
- Redis or Cassandra (for caching auth tokens and storing rate limit values)

# Configuration

Configuration is stored in a JSON format in a file. Example configuration can
be found in `example/config.json`.

## Middleware configuration options

### Identity provider

This middleware parses a user tenant id from the header called `X-Tenant-Id`
or from the URL and puts it on the request object.

### Authentication

This middleware authenticates a user against the [Keystone
API](http://docs.openstack.org/incubation/identity-dev-guide/content/Overview-Keystone-API-d1e62.html).

* `username` - admin username for the Keystone auth server
* `password` - admin password for the Keystone auth server
* `urls` - an array of Kesystone API URLs to hit in parallel when
authenticating a user. Authentication is be considered as successful if at
least one URL returns a success. By default this array contains URL for US and
UK Keystone server.

### Rate limiting

This middleware provides flexible rate limiting based on the requested paths.

* `bucket_size` - Size of a bucket in seconds. This value also specifies a
  minimum time period you can rate limit on.
* `limits` - An array of limit objects. Each object has the following keys:
  * `method` - HTTP method of the limited path
  * `path_regex` - Regular expression for the limited path
  * `limit` - Request limit for this path
  * `period` - Period in seconds. This value can't be smaller than
  `bucket_size`

# TODO

- Support for multiple targets and round robin balancing across them
- Performance optimizations

# Concepts

## Middleware

A middleware acts on a request and can perform different things...
