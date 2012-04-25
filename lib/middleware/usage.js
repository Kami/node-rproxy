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

var log = require('logmagic').local('lib.middleware.usage');
var sprintf = require('sprintf').sprintf;
var uuid = require('node-uuid');
var et = require('elementtree');

var ElementTree = et.ElementTree;
var element = et.Element;
var subElement = et.SubElement;


var config = require('../util/config').config;
var request = require('../util/request').request;
var misc = require('../util/misc');

exports.HEADER_KEY_NAMES = ['x-usage-resource-id', 'x-usage-resource-name',
                            'x-usage-resource-action', 'x-usage-resource-data'];


/**
 * Send atom entry to the Atom Hopper instance.
 *
 * @param {String} url Atom hopper URL.
 * @param {Object} usageObj Usage object.
 * @param {Function} callback Callback called with (err, res).
 */
function sendEntryToAtomHopper(url, usageObj, callback) {
  var entry = buildAtomEntry(usageObj), options = {'expected_status_codes': [201],
    'headers': {'Content-Type': 'application/atom+xml'}, 'return_response': true, 'timeout': 40000};

  request(url, 'POST', entry, options, callback);
}

/**
 * Build an Atom Hopper atom entry.
 *
 * @param {Object} usageObj Usage object.
 * @return {String} Atom hopper entry.
 */
function buildAtomEntry(usageObj) {
  var date, root, tenantId, serviceName, eventType, usageId, dataCenter, region,
      resourceId, category, startTime, endTime, resourceName, etree, xml,
      settings = config.middleware.usage.settings;

  date = new Date(usageObj.timestamp * 1000);

  root = element('entry');
  root.set('xmlns', 'http://www.w3.org/2005/Atom');

  tenantId = subElement(root, 'TenantId');
  tenantId.text = usageObj.user_id;

  serviceName = subElement(root, 'ServiceName');
  serviceName.text = settings.service_name;

  if (usageObj.id) {
    resourceId = subElement(root, 'ResourceID');
    resourceId.text = usageObj.id;
  }

  usageId = subElement(root, 'UsageID');
  usageId.text = uuid.v4();

  eventType = subElement(root, 'EventType');
  eventType.text = usageObj.action;

  category = subElement(root, 'category');
  category.set('term', sprintf('%s.%s.%s', settings.service_name, usageObj.resource, usageObj.action));

  dataCenter = subElement(root, 'DataCenter');
  dataCenter.text = settings.datacenter;

  region = subElement(root, 'Region');
  region.text = settings.region;

  startTime = subElement(root, 'StartTime');
  startTime.text = misc.toRfc3339Date(date);

  if (usageObj.action === 'exists') {
    endTime = subElement(root, 'EndTime');
    endTime.text = misc.toRfc3339Date(new Date(contentObj.object.interval_end_ts));
  }

  resourceName = subElement(root, 'ResourceName');
  resourceName.text = usageObj.resource;

  etree = new ElementTree(root);
  xml = etree.write({'xml_declaration': false});
  return xml;
}

exports.processRequest = function(req, res, callback) {
  var settings = config.middleware.usage.settings, oldWriteHead = res.writeHead;

  res.writeHead = function(code, headers) {
    var id, name, action, data, usageObj;
    headers = headers || {};

    if (headers.hasOwnProperty(exports.HEADER_KEY_NAMES[0])) {
      id = headers[exports.HEADER_KEY_NAMES[0]];
      name = headers[exports.HEADER_KEY_NAMES[1]];
      action = headers[exports.HEADER_KEY_NAMES[2]];
      data = headers[exports.HEADER_KEY_NAMES[3]];
      usageObj = {'id': id, 'user_id': req.user_id, 'name': name, 'action': action, 'data': data};


      // This headers are never returned to the user
      exports.HEADER_KEY_NAMES.forEach(function(key) {
        delete headers[key];
      });

      try {
        data = JSON.parse(data);
      }
      catch (err) {
        log.error('Failed to parse resource data', {'error': err});
        oldWriteHead.call(res, code, headers);
        return;
      }

      sendEntryToAtomHopper(settings.atom_hopper_url, usageObj, function(err, res) {
        if (err) {
          log.error('Failed to send entry to Atom Hopper server', {'url': settings.atom_hopper_url, 'error': err});
        }
        else {
          log.debug('Entry sucesfully sent to the Atom Hopper server', {'url': settings.atom_hopper_url});
        }
      });
    }

    oldWriteHead.call(res, code, headers);
  };

  callback();
};
