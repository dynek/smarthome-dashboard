// first of all, let's be strict!
"use strict";

// home automation module
var homeAutomation = function() {

  // properties
  var common = require('./common'),
  http = require('http'),
  data = null,
  hc2_settings = null,
  clientsCount = 0,
  timer = null,

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
  },

  // return JSON containing sections, rooms, devices, etc.
  getData = function() {
    // if data is available return straight away
    if(data !== null) {
      common.logMessage("DATA FROM CACHE !!!!")
      return Promise.resolve(data);
    } else {
      // re-run function when timeout occurs
      // promises required to build reply for clients
      return readhc2();
    }
  },

  // set client count (used in readhc2)
  setClientsCount = function(int) {
    clientsCount = int;
    // no more client -> clear data, clear timer: in case a client connects straight afterwards (reload page for instance)
    if(clientsCount == 0) {
      common.logMessage("no more client clearing cache and timer")
      data = null;
      clearTimeout(timer);
    }
  },

  // get data from hc2
  httpGet = function(path) {
    var options = {
      auth: hc2_settings.credentials,
      host: hc2_settings.host,
      port: hc2_settings.port,
      path: path,
      method: 'GET'
    }, payload = '';

    return new Promise(function(resolve, reject) {
      var request = http.request(options, function (response) {
        common.logMessage('GET ' + path + ' HTTP status code: ' + response.statusCode);
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          payload += chunk;
        });

        response.on('end', function(){
          //resolve the deferred object with the response
          var tmp = {}; tmp[path] = JSON.parse(payload);
          resolve(tmp);
        });
      });

      request.on('error', function(err) {
        //if an error occurs reject the deferred
        reject(err);
      });

      request.end();
    });
  },

  // read data from hc2
  readhc2 = function() {
    // if at least one client is connected poll information from hc2
    if(clientsCount > 0) {
      common.logMessage(clientsCount + " client(s) connected: polling data from HC2 to have up to date information");

      // promises required to build reply for clients
      return Promise.all([
        httpGet("/api/sections"),
        httpGet("/api/rooms")
      ])
      .then(function(responses) {
        data = { action: 'print', data: responses };
        timer = setTimeout(function() { readhc2(); }, hc2_settings.polling * 1000);
        return data;
      });
    }
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
