// first of all, let's be strict!
"use strict";

// home automation module
var homeAutomation = function() {
  
  // variables
  var MAX_STORAGE_ITEMS = 40, // "constant" 
  common = require('./common'),
  hc2_settings = null,
  clientsCount = 0,
  devices = {},
  storage = {},

  // init module
  init = function(opts) {
    // save settings
    hc2_settings = opts;

    // update HC2 that pushes notification when devices state change
    updateScene(true);
  },

  // set client count
  setClientsCount = function(int) {
    clientsCount = int;
  },

  // fetch data from HC2 to create/update scene updating us on device state changes
  updateScene = function(bFirst) {
    common.logMessage("[HOMEAUTOMATION] let's query HC2 for its devices to create/update scene pushing device state changes");

    // clear devices
    devices = {};

    // run http query
    return httpGet("/api/devices").then(function(response) {
      common.logMessage("[HOMEAUTOMATION] devices successfully fetched success");

      // save devices information for later use
      var objRoot = response["/api/devices"];
      for (var key in objRoot) {
        devices[objRoot[key].id] = { "name": objRoot[key].name, "type": objRoot[key].type, "value": objRoot[key].properties.value, "value2": objRoot[key].properties.value2 };
      }

      // create/update scene
      return httpGet("/api/scenes");
    }).then(function(response) {
      // scene id, remains null if scene should be created otherwise will contain id of node-tification scene
      var sceneID = null;

      // let's create the lua scene code
      var lua_scene = "--[[\
\n%% properties";

      // go through returned devices to find those with value/value2 property
      for (var id in devices) {
        common.logMessage("[HOMEAUTOMATION] adding " + id + " - " + devices[id].name + " - " + devices[id].type + " [value: " +  devices[id].value + "] [value2: " +  devices[id].value2 + "]");

        // add device id as trigger for our scene
	if(typeof devices[id].value !== 'undefined') { lua_scene += "\n" + id + " value"; }
        if(typeof devices[id].value2 !== 'undefined') { lua_scene += "\n" + id + " value2"; }

	// only when iterating for the first time (when node app started)
        // store temperature, co2, humidity, pressure, noise, light
        if(bFirst === true &&
	(devices[id].type === "com.fibaro.temperatureSensor" ||
        devices[id].type === "com.fibaro.multilevelSensor" ||
        devices[id].type === "com.fibaro.humiditySensor" ||
        devices[id].type === "com.fibaro.lightSensor")) {
          // create array for device in storage
          storage[id] = [];

          // add new value into array
          storage[id].push({
            timestamp: new Date(),
            value: devices[id].value
          });
        }
      }

      // rest of the scene, basically a debug message and the http request towards our http server listening for status notification
      lua_scene += "\n%% globals\
\n--]]\
\n\
\nlocal startSource = fibaro:getSourceTrigger();\
\nsource = startSource[\"propertyName\"];\
\ndeviceID = startSource[\"deviceID\"];\
\n";
      if(common.isDebug()) { lua_scene += "\nfibaro:debug(\"ID: \"..deviceID..\" - \"..source..\": \"..fibaro:getValue(deviceID, source));"; }
      lua_scene += "\nnet.HTTPClient():request(\"http://"+hc2_settings.myself+"/status?id=\"..deviceID..\"&\"..source..\"=\"..fibaro:getValue(deviceID, source));";

      // checking if scene already exists
      common.logMessage("[HOMEAUTOMATION] looping scenes to find '" + hc2_settings.sceneName + "'");
      for (var i = 0; i < response['/api/scenes'].length; i++) {
        // exist if scene was found already (haven't found cleaner way until now)
        if(sceneID !== null) break;

        // check if name matches
        if(response['/api/scenes'][i].name == hc2_settings.sceneName) {
          sceneID = response['/api/scenes'][i].id;
        }
      }

      // data to POST/PUT later
      var data = {
        name: hc2_settings.sceneName,
        enabled: true,
        isLua: true,
        maxRunningInstances: 10, // ensure scene is allowed to run side-by-side (10 times) in case it's triggered in parallel
        lua: '' // not currently possible to post lua code, only works on put
      };

      var method = "PUT"; // method that will be used the most
      var path = "/api/scenes";
      if(sceneID === null) {
        common.logMessage("[HOMEAUTOMATION] scene doesn't exist - let's create it");

        // changing method to POST to create missing scene
        method = "POST";
      } else {
        common.logMessage("[HOMEAUTOMATION] scene exists with ID " + sceneID + " - let's update it");

        // add existing scene id to data to PUT
        data['id'] = sceneID;
        data.lua = lua_scene; // can be removed once lua_code can be POST (will be filled out above in "var data")

        // add scene id to queried path
        path += "/" + sceneID;
      }

      // run query against HC2 and return promise
      return httpRequest(method, path, data);
    }).then(function() {
      // when httpRequest is successful
      common.logMessage("[HOMEAUTOMATION] setting timeout for next scene update to " + hc2_settings.polling + " seconds");
      setTimeout(function() { updateScene(); }, hc2_settings.polling * 1000);
    }, function() {
      // when httpRequest miserably failed :-)
      common.logMessage("[HOMEAUTOMATION] something went wrong - setting timeout for next scene update to " + hc2_settings.polling_fail + " seconds");
      setTimeout(function() { updateScene(); }, hc2_settings.polling_fail * 1000);
    });
  },

  // return JSON containing sections, rooms, devices, etc.
  getData = function() {
    common.logMessage("[HOMEAUTOMATION] polling data from HC2");

     // to be able to read it from any "then"
     var result = { action: 'schema', info: {} };

    // promises required to build reply for clients
    return Promise.all([
      httpGet("/api/scenes"),
      httpGet("/api/sections"),
      httpGet("/api/rooms"),
      httpGet("/api/devices")
    ]).then(function(responses) {
      common.logMessage("[HOMEAUTOMATION] got all responses from promises (i.e. " + responses.length + " responses)");

      // get rid off useless level brought by bundle of promises
      for (var i = 0; i < responses.length; i++) {
        // get key name e.g. "/api..."
        var keyname = Object.keys(responses[i])[0];
        result.info[keyname] = responses[i][keyname];
      }

      // add stuff stored since node started running
      result.info["/storage"] = storage;

      // return result directly or keep going if there are scenes
      if(typeof result.info["/api/scenes"] === 'undefined' || result.info["/api/scenes"].length === 0) {
        common.logMessage("[HOMEAUTOMATION] No scene was found");
        return result;
      }

      // if we do have scenes let's check if there's triggers
      common.logMessage("[HOMEAUTOMATION] " + result.info["/api/scenes"].length + " scenes found - let's go deeper");

      // for each of them
      var scenesPromises = [];
      for (var i = 0; i < result.info["/api/scenes"].length; i++) {
	// set hasTrigger to false by default
        result.info["/api/scenes"][i].hasTriggers = false;

        // get full scene details
        scenesPromises.push(httpGet("/api/scenes/" + result.info["/api/scenes"][i].id));
      }
      return Promise.all(scenesPromises).then(function(responses) {
        common.logMessage("[HOMEAUTOMATION] got all responses from promises for scenes (i.e. " + responses.length + " responses)");

        // let's add what we are interested in
        for (var i = 0; i < responses.length; i++) {
	  // get key name "/api/scenes/..."
          var keyname = Object.keys(responses[i])[0];
	  // if scene contains properties/globals triggers
          if(responses[i][keyname].triggers.properties.length >= 1 || responses[i][keyname].triggers.globals.length >= 1) {
	    // pretty ugly - if anyone has a clue...
            for (var j = 0; j < result.info["/api/scenes"].length; j++) {
	      // if ID matches
	      if(result.info["/api/scenes"][j].id === responses[i][keyname].id) {
	        // this scene does have trigger(s)
                result.info["/api/scenes"][j].hasTriggers = true;
              }
            }
          }
        }

        // and return result
        return result;
      });
    });
  },

  // get data from hc2
  httpGet = function(path) {
    return httpRequest('GET', path);
  },

  httpRequest = function(method, path, data) {
    var options = {
      auth: hc2_settings.credentials,
      host: hc2_settings.host,
      port: hc2_settings.port,
      path: path,
      method: method
    }, payload = '';

    // stringify object
    data = JSON.stringify(data);

    // if data was passed
    if(typeof data !== 'undefined') {
      options.headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }

    return new Promise(function(resolve, reject) {
      var request = require('http').request(options, function (response) {
        response.setEncoding('utf8');
        response.on('data', function (chunk) {
          payload += chunk;
        });

        response.on('end', function(){
          common.logMessage('[HOMEAUTOMATION] ' + method + ' ' + path + ' HTTP status code: ' + response.statusCode);
          if(response.statusCode != '200' && response.statusCode != '201') {
            reject("http status code: " + response.statusCode);
          } else {
            //resolve the deferred object with the response
            if(payload !== '') {
              var tmp = {}; tmp[path] = JSON.parse(payload);
              resolve(tmp);
            } else {
              resolve();
            }
          }
        });
      }).on('error', function(err) {
        // error occured
        reject(err);
      });

      // if data was specified
      if(typeof data !== 'undefined') {
        request.write(data);
      }

      // end request
      request.end();
    });
  },

  deviceChangedStatus = function(id, valuetype, value) {
    // if at least one client is connected send information
    if(clientsCount > 0) {
      common.logMessage("[HOMEAUTOMATION] device " + id + " " + valuetype + " changed to " + value);
      var data = { "action": "deviceChanged", info: { "id": id } };
      data.info[valuetype] = value;
      require('./websocketserver').sendMessage(data);
    }

    // store temperature, co2, humidity, pressure, noise, light
    if(devices[id].type === "com.fibaro.temperatureSensor" ||
    devices[id].type === "com.fibaro.multilevelSensor" ||
    devices[id].type === "com.fibaro.humiditySensor" ||
    devices[id].type === "com.fibaro.lightSensor") {
      // if max number of items to keep is reached, remove one before adding the latest value
      if(storage[id].length == MAX_STORAGE_ITEMS) { storage[id].shift(); }

      // add new value into array
      storage[id].push({
        timestamp: new Date(),
        value: value
      }); 
    }
  },

  turnOn = function(id) {
     common.logMessage("Turning on device ID " + id);
     httpRequest("POST", "/api/devices/" + id + "/action/turnOn");
  },

  turnOff = function(id) {
     common.logMessage("Turning off device ID " + id);
     httpRequest("POST", "/api/devices/" + id + "/action/turnOff");
  },
  
  setValue = function(id, value, isSecondValue) {
     // enforce integer value
     value = parseInt(value, 10);

     common.logMessage("Setting value of device ID " + id + " to " + value);
     httpRequest("POST", "/api/devices/" + id + "/action/setValue", { args: [ value ] });
  },

  setValue2 = function(id, value, isSecondValue) {
     // enforce integer value
     value = parseInt(value, 10);

     common.logMessage("Setting value2 of device ID " + id + " to " + value);
     httpRequest("POST", "/api/devices/" + id + "/action/setValue2", { args: [ value ] });
  },
  
  executeScene = function(id) {
     common.logMessage("Running scene ID " + id);
     httpRequest("GET", "/api/sceneControl?id=" + id + "&action=start");
  };

  // expose functions
  return {
    init: init,
    setClientsCount: setClientsCount,
    getData: getData,
    deviceChangedStatus: deviceChangedStatus,
    turnOn: turnOn,
    turnOff: turnOff,
    setValue: setValue,
    setValue2: setValue2,
    executeScene: executeScene,
  };
}();

// module exports
module.exports = homeAutomation;
