// first of all, let's be strict!
"use strict";

// home automation module
var homeAutomation = function() {

  // properties
  var common = require('./common'),
  Q = require('q'),
  http = require('http'),
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

  // init module
  init = function(opts) {
    // save settings
    hc2_settings = opts;

    // start polling information from fibaro homecenter
    readhc2(true);
  },

  // return JSON containing sections, rooms, devices, etc.
  getData = function() {
    return data;
  },

  // set client count (used in readhc2)
  setClientsCount = function(int) {
    clientsCount = int;
  },

  // get data from hc2
  httpGet = function(path) {
    var deferred  = Q.defer();
    var options = {
      auth: hc2_settings.credentials,
      host: hc2_settings.host,
      port: hc2_settings.port,
      path: path,
      method: 'GET'
    }, payload = '';

    var request = http.request(options, function (response) {
      common.logMessage('GET ' + path + ' HTTP status code: ' + response.statusCode);
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        payload += chunk;
      });

      response.on('end', function(){
        //resolve the deferred object with the response
        var tmp = {}; tmp[path] = JSON.parse(payload);
        deferred.resolve(tmp);
      });
    });

    request.on('error', function(err) {
      //if an error occurs reject the deferred
      deferred.reject(err);
    });

    request.end();

    return deferred.promise;
  },

  // read data from hc2
  readhc2 = function(force) {
    // if at least one client is connected (or if force is passed) poll hc2
    if(clientsCount >= 1 || force) {
      common.logMessage("polling data from HC2")

      // promises required to build reply for clients
      Q.all([ httpGet("/api/sections"), httpGet("/api/rooms"), httpGet("/api/devices") ])
      .then(function(responses) {
        //common.logMessage(JSON.stringify(responses));
        data = { action: 'print', data: responses };
      }, function (err) {
        //common.logMessage('Problem with request: ' + err);
        common.logMessage(error);
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
