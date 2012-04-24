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

# TODO

- Support for multiple targets and round robin balancing across them
- Performance optimizations

# Concepts

## Middleware

A middleware acts on a request and can perform different things...
