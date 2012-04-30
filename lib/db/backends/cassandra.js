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

var cassandra = require('cassandra-client');
var log = require('logmagic').local('lib.db.backends.cassandra');


/**
 * Cassandra client.
 * @constructor
 *
 * @param {Object} options Client options.
 */
var CassandraClient = function(options) {
  options = options || {};

  this._options = options;

  this._hosts = options.hosts;
  this._keyspace = options.keyspace;
  this._columnFamily = options.column_family;
  this._readConsistency = options.read_consistency;
  this._writeConsistency = options.write_consistency;

  this._rowKey = 'rproxy';

  this._client = this._getClient();
  this._client.connect(function() {});
};


/**
 * Set up and return a cassandra client instance.
 *
 * @return {Object} Cassandra client instance.
 */
CassandraClient.prototype._getClient = function() {
  var client = new cassandra.PooledConnection({
      'hosts': this._hosts,
      'keyspace': this._keyspace,
      'use_bigints': false
  });

  client.on('log', function(level, message, obj) {
    obj = obj || {};
    log.debug(message, obj);
  });

  return client;
};


/**
 * Execute a query and format the result.
 *
 * @param {String} query CQL query.
 * @param {Array} args Values used for binding the query.
 * @param {Function} callback Callback called with (err, res).
 */
CassandraClient.prototype._execute = function(query, args, callback) {
  this._client.execute(query, args, function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    if (!res) {
      callback(null, null);
      return;
    }

    res = res[0].cols.map(function(col) {
      return col.value;
    });

    callback(null, res);
  });
};


/**
 * Retrieve a value.
 *
 * @param {String} key Key.
 * @param {Function} callback Callback called with (err, result).
 */
CassandraClient.prototype.get = function(key, callback) {
  this.getMulti([key], function(err, res) {
    if (err) {
      callback(err);
      return;
    }

    if (res.length === 0) {
      res = null;
    }

    callback(null, res);
  });
};


/**
 * Retrieve multiple values.
 *
 * @param {String} key Key.
 * @param {Function} callback Callback called with (err, results).
 */
CassandraClient.prototype.getMulti = function(keys, callback) {
  var query, args, i, len, keysStr = '';

  for (i = 0, len = keys.length; i < len; i++) {
    keysStr += keys[i];

    if (i !== (len - 1)) {
      keysStr += ', ';
    }
  }

  query = 'SELECT ? FROM ? USING CONSISTENCY ' + this._readConsistency + ' WHERE KEY = ?';
  args = [keysStr, 'counters', this._rowKey];
  this._execute(query, args, callback);
};


/**
 * Set a key.
 *
 * @param {String} key Key.
 * @param {String} value Value.
 * @param {?Object} Options with the following keys: ttl.
 * @param {Function} callback Callback called with (err, result).
 */
CassandraClient.prototype.set = function(key, value, options, callback) {
  options = options || {};
  var query, ttlStr = ' ', args;

  if (options.ttl) {
    ttlStr = ' AND TTL ' + options.ttl;
  }

  query = 'UPDATE ? USING CONSISTENCY ' + this._writeConsistency;
  query += ttlStr + ' SET ? = ? WHERE KEY = ?';
  args = ['main', key, value, this._rowKey];
  this._execute(query, args, callback);
};


/**
 * Increment a counter.
 *
 * @param {String} key Key.
 * @param {?Object} Options with the following keys: ttl, step.
 * @param {Function} callback Callback called with (err, result).
 */
CassandraClient.prototype.incr = function(key, options, callback) {
  options = options || {};
  var query, ttlStr = ' ', args, step = step || 1;

  if (options.ttl) {
    ttlStr = ' AND TTL ' + options.ttl;
  }

  query = 'UPDATE ? USING CONSISTENCY ' + this._writeConsistency;
  query += ttlStr + ' SET ? = ? + ? WHERE KEY = ?';
  args = ['counters', key, key, step, this._rowKey];
  this._execute(query, args, callback);
};


/*
 * Remove a key.
 *
 * @param {String} key Key.
 * @param {Function} callback Callback called with (err, result).
 */
CassandraClient.prototype.remove = function remove(key, callback) {
  var query, args;

  query = 'DELETE ? FROM ? USING CONSISTENCY ' + this._writeConsistency;
  query += ' WHERE KEY = ?';
  args = [key, 'main', this._rowKey];

  this._execute(query, args, callback);
};


exports.CassandraClient = CassandraClient;
