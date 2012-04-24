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

## Middleware configuration option

### identity provider

### authentication

* `username` - admin username for the Keystone auth server
* `password` - admin password for the Keystone auth server
* `urls` - an array of Kesystone API URLs to hit in parallel when
authenticating a user. Authentication is be considered as successful if at
least one URL returns a success. By default this array contains URL for US and
UK Keystone server.

### rate limiting

# TODO

- Support for multiple targets and round robin balancing across them
- Performance optimizations

# Concepts

## Middleware

A middleware acts on a request and can perform different things...
