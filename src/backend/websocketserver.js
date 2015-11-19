// first of all, let's be strict!
"use strict";

// websocket server module
var webSocketServer = function () {

  // properties
  var common = require('./common'),
  homeautomation = require('./homeautomation'),
  socketDomain = require('domain').create(),
  ws = null,

  listen = function(port, hc2_settings) {
    // when we start listening instanciate homeautomation module
    homeautomation.init(hc2_settings);

    // catch domain error
    socketDomain.on('error', function(err) {
      common.logMessage('Error caught in socket domain:' + err);
    });

    // within a domain, instanciate websocket server, have it listen and manage client connections
    socketDomain.run(function() {
      ws = require('websocket.io').listen(port);

      // occurs when a client connects
      ws.on('connection', function (clientSocket) {
        common.logMessage("incoming websocket connection - number of clients: " + ws.clientsCount);

        // update home automation module with client count
        homeautomation.setClientsCount(ws.clientsCount);

        // send sections, rooms, devices, etc. to client that just connected
        //var data = homeautomation.getData();
        //if(data == null) { // data not yet ready, ask client to retry
        //  sendMessage({ action: 'retry' }, clientSocket);
        //} else {
        //  sendMessage(data, clientSocket);
        //}

        homeautomation.getData()
        .then(function(responses) {
          //common.logMessage(JSON.stringify(responses));
          sendMessage(responses, clientSocket);
        }, function (err) {
          //common.logMessage('Problem with request: ' + err);
          common.logMessage(err);
        });

        // occurs when a message is received
        clientSocket.on('message', function (data) {
          common.logMessage("Message received: " + data);
        });

        // occurs when the client closes its socket
        clientSocket.on('close', function () {
          try {
            clientSocket.close();
            clientSocket.destroy();
            common.logMessage('Socket closed');

            // update home automation module with client count
            homeautomation.setClientsCount(ws.clientsCount);
          } catch (e) {
            common.logMessage(e);
          }
        });
      });
    });
  },

  // send message to one or all clients
  sendMessage = function(json, clientSocket) {
    common.logMessage("Sending data");
    // if clientSocket is not specified message will be broadcasted to all clients
    if(typeof clientSocket === "undefined") {
       common.logMessage("message will be broadcasted");
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
       common.logMessage("message is targeting specific client");
       clientSocket.send(JSON.stringify(json));
    }
  };

  // expose functions
  return {
    listen: listen
  };
}();

// module exports
module.exports = webSocketServer;
