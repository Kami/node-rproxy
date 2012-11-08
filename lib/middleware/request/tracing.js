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

var KeystoneClient = require('keystone-client').KeystoneClient;
var trace = require('tryfer').trace;
var tracers = require('tryfer').tracers;
var nodeTracers = require('tryfer').node_tracers;

var config = require('../../util/config').config;
var settings = config.middleware.tracing;

exports.SERVICE_NAME = 'rsr:node-rproxy';

var client = new KeystoneClient(settings.authentication.url, {'username': settings.authentication.username,
                                                              'apiKey': settings.authentication.apiKey});
tracers.pushTracer(new nodeTracers.RESTkinTracer(settings.restkin.url, client));

exports.dependencies = ['identity_provider'];

exports.processRequest = function(req, res, callback) {
  var t = trace.Trace.fromRequest(req, exports.SERVICE_NAME);

  callback();

  // Asynchronously record that we have received a client request
  t.record(trace.Annotation.serverRecv());
  t.record(trace.Annotation.string('request_headers',
                                   JSON.stringify(req.headers)));
  t.record(trace.Annotation.string('user_id', req.userId));
};
