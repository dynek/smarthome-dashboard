// first of all, let's be strict!
"use strict";

// websocket server module
var webSocketServer = function () {

  // variables
  var common = require('./common'),
  homeautomation = require('./homeautomation'),
  socketDomain = require('domain').create(),
  ws = null,

  // function managing listening for websocket traffic (discussion with clients)
  listen = function(port, hc2_settings) {
    // when we start listening instanciate homeautomation module
    homeautomation.init(hc2_settings);

    // catch domain error
    socketDomain.on('error', function(err) {
      common.logMessage('[WEBSOCKETSERVER] error caught in socket domain:' + err);
    });

    // within domain, instanciate websocket server
    socketDomain.run(function() {
      ws = require('websocket.io').listen(port);

      // occurs when a client connects
      ws.on('connection', function (clientSocket) {
        common.logMessage("[WEBSOCKETSERVER] incoming websocket connection - number of clients: " + ws.clientsCount);

        // update home automation module with client count
        homeautomation.setClientsCount(ws.clientsCount);

        // get HC2 data and send info to connecting client
        homeautomation.getData()
        .then(function(responses) {
          common.logMessage("[WEBSOCKETSERVER] homeautomation.getData() success");
          sendMessage(responses, clientSocket);
        }, function (err) {
          common.logMessage("[WEBSOCKETSERVER] homeautomation.getData() failed");
          sendMessage({ action: 'error', info: 'error please try reloading page' }, clientSocket);
        });

        // occurs when a message is received from a client
        clientSocket.on('message', function (message) {
          common.logMessage("[WEBSOCKETSERVER] message received from client");

          // ensure data can be "transformed" to JSON
          try {
            var data = JSON.parse(message);
          } catch (e) {
            common.logMessage("[WEBSOCKETSERVER] it doesn't look like JSON: " + message);
            return;
          }

          // parse json and act!
          processJSON(data, clientSocket);
        });

        // occurs when the client closes its socket
        clientSocket.on('close', function () {
          try {
            clientSocket.close();
            clientSocket.destroy();
            common.logMessage("[WEBSOCKETSERVER] socket closed - number of clients: " + ws.clientsCount);

            // update home automation module with client count
            homeautomation.setClientsCount(ws.clientsCount);
          } catch (err) {
            common.logMessage("[WEBSOCKETSERVER] error: " + err);
          }
        });
      });
    });
  },

  // send message to one or all clients
  sendMessage = function(json, clientSocket) {
    // if clientSocket is not specified message will be broadcasted to all clients
    if(typeof clientSocket === "undefined") {
       common.logMessage("[WEBSOCKETSERVER] broadcasting message");
       if (ws.clientsCount > 0) {
         for(var i=0; i<ws.clientsCount; i++) {
           try {
             ws.clients[i].send(JSON.stringify(json));
           } catch (e) {
             common.logMessage(e);
           }
         }
       }
    } else {
       // sending message to specific client
       common.logMessage("[WEBSOCKETSERVER] sending message to specific client");
       clientSocket.send(JSON.stringify(json));
    }
  },

  // process incoming messages
  processJSON = function(data, clientSocket) {
    common.logMessage("processing JSON data");

    // ensure action and data have been specified
    if(typeof data.action === 'undefined') { common.logMessage("action is missing in received json"); return; }
    if(typeof data.info === 'undefined') {  common.logMessage("info missing in received json"); return; }

    // tasks based on action
    switch(data.action) {
      case "turnOn":
        homeautomation.turnOn(data.info);
        break;

      case "turnOff":
        homeautomation.turnOff(data.info);
        break;

      case "setValue":
      case "setValue2":
        if(typeof data.info.id === 'undefined') { common.logMessage("info missing id in received json"); return; }
        if(typeof data.info.value === 'undefined') { common.logMessage("info missing value in received json"); return; }
        if(data.action === "setValue") {
          homeautomation.setValue(data.info.id, data.info.value);
        } else {
          homeautomation.setValue2(data.info.id, data.info.value);
        }
        break;

      case "executeScene":
        homeautomation.executeScene(data.info); 
        break;

      default:
        common.logMessage("unknown action '" + data.action + "' specified in received json");
    }
  };

  // expose functions
  return {
    listen: listen,
    sendMessage: sendMessage
  };
}();

// module exports
module.exports = webSocketServer;
