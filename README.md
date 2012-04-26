## node-rproxy (Eon)

A reverse proxy for RESTful services.

# Features

* Authentication via the Keystone API
* Flexible rate limiting based on the source IP address
* Supported database backends
  * Redis
  * Cassandra

# Concepts

## Middleware

Middleware is a node module which exposes a single method and acts on a request
or a response. There are two types of middleware:

* request middleware - This type of middleware acts on a request before it's proxied to
  the backend server. It can for example talk to a remote authentication server
  or implement rate limiting.
* response middleware - This type of middleware acts on a response returned by
  the backend before the responses is returned back to the user. It can for
  example strip or inject extra headers in the response.

# Requirements

- Node.js
- Redis or Cassandra (for caching auth tokens and storing rate limit values)

# Configuration

Configuration is stored in a JSON format in a file. Example configuration can
be found in `example/config.json`.

# Middleware configuration options

## Identity provider

This middleware parses a user tenant id from the header called `X-Tenant-Id`
or from the URL and puts it on the request object.

## Authentication

This middleware authenticates a user against the [Keystone
API](http://docs.openstack.org/incubation/identity-dev-guide/content/Overview-Keystone-API-d1e62.html).

### Settings

* `username` - admin username for the Keystone auth server
* `password` - admin password for the Keystone auth server
* `urls` - an array of Kesystone API URLs to hit in parallel when
authenticating a user. Authentication is be considered as successful if at
least one URL returns a success. By default this array contains URL for US and
UK Keystone server.
* `whitelist` - A list of paths which don't require authentication

### Error codes

* `NR-1000` - missing `X-Tenant-Id` header
* `NR-1001` - missing `X-Auth-Token` header
* `NR-1002` - invalid or expired auth token

## Rate limiting

This middleware provides flexible rate limiting based on the requested paths.

### Settings

* `bucket_size` - Size of a bucket in seconds. This value also specifies a
  minimum time period you can rate limit on.
* `limits` - An array of limit objects. Each object has the following keys:
  * `method` - HTTP method of the limited path
  * `path_regex` - Regular expression for the rate limited path
  * `limit` - Request limit for this path
  * `period` - Period in seconds. This value can't be smaller than
  `bucket_size`
* `view_path` - Special path which, when hit will sent current user limits to the
  backend using a POST request
* `view_backend_path` - Path on the backend where the users limits are sent to
  when user hits `view_path` on the proxy.

### Error codes

* `NR-2000` - rate limit has been reached

## Usage

This middleware intercepts special usage headers returned by the backend and
sends usage events to an [Atom Hopper](http://atomhopper.org/) instance.

### Settings

* `url` - Atom Hopper instance URL
* `service_name` - Name of the service
* `region` - Service region or `global`
* `datacenter` - Service datacenter or `global`

## Special header names

* X-RP-Error-Code
* X-RP-Error-Message

# TODO

- Benchmarking
- Performance optimizations
- Stats middleware
- Log middleware
- Integration guide
