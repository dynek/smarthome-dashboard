// first of all, let's be strict!
"use strict";

// home automation module
var homeAutomation = function() {

  // properties
  var common = require('./common'),
  http = require('http'),
  httpDomain = require('domain').create(),
  data = null,
  hc2_settings = null,
  clientsCount = 0,

  // process JSON
  /*processJSON = function(json) {
    common.logMessage("processing JSON data");

    // ensure action and data have been specified
    if(typeof json.action === 'undefined') { throw new Error("action is missing in received json"); }
    if(typeof json.data === 'undefined') { throw new Error("data missing in received json"); }

    // tasks based on action
    switch(json.action) {
      // as an example, printing data
      case "print":
        common.logMessage(JSON.stringify(json.data));
        break;

      default:
        throw new Error("unknown action '" + json.action + "' specified in received json");
    }
  },*/

  init = function(opts) {
    // save settings
    hc2_settings = opts;

    // configure http domain error event
    httpDomain.on('error', function(err) {
      common.logMessage('Error caught in http domain:' + err);
    });

    // start polling information from fibaro homecenter
    readhc2(true);
  },

  getData = function() {
    // return JSON containing sections, rooms, devices, etc.
    return data;
  },

  setClientsCount = function(int) {
    clientsCount = int;
  },

  readhc2 = function(force) {
    // if at least one client is connected (or if force is passed) poll hc2
    if(clientsCount >= 1 || force) {
      common.logMessage("polling data from HC2")
      // within a domain, run http request
      httpDomain.run(function() {
        var options = {
          auth: hc2_settings.credentials,
          host: hc2_settings.host,
          port: hc2_settings.port,
          path: '/api/rooms',
          method: 'GET'
        }, payload = '';

        var request = http.request(options, function (response) {
          common.logMessage('STATUS: ' + response.statusCode);
          response.setEncoding('utf8');
          response.on('data', function (chunk) {
            payload += chunk;
          });

          response.on('end', function(){
            data = { action: 'print', data: JSON.parse(payload) };
          });
        });

        request.on('error', function(err) {
          common.logMessage('Problem with request: ' + err);
        });

        request.end();
      });
    }

    // re-run function when timeout occurs
    setTimeout(function() { readhc2(); }, hc2_settings.polling * 1000);
  };

  // expose functions
  return {
    //processJSON: processJSON,
    init: init,
    getData: getData,
    setClientsCount: setClientsCount,
  };

}();

// module exports
module.exports = homeAutomation;
