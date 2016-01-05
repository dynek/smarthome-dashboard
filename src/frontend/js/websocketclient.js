// first of all, let's be strict!
"use strict";

// requirements
if(typeof __COMMON_JS === 'undefined') { throw new Error("[WEBSOCKETCLIENT] common.js is required and was not yet loaded!"); }
if(typeof __HOMEAUTOMATION_JS === 'undefined') { throw new Error("[WEBSOCKETCLIENT] homeautomation.js is required and was not yet loaded!"); }

// include guard
if(typeof __WEBSOCKETCLIENT_JS !== 'undefined') { throw new Error("[WEBSOCKETCLIENT] websocketclient.js was already included!"); }
var __WEBSOCKETCLIENT_JS = null;

// websocket client module
var webSocketClient = function() {

  // variables
  var ws = null,

  // manage connection to remote server
  connect = function(settings) {
    // check that required info was specified
    if(typeof settings.ws_host === 'undefined' || typeof settings.ws_port === 'undefined') { throw new Error("[WEBSOCKETCLIENT] missing either host or port required to connect to websocket server"); }

    // for mozilla: "Starting in Gecko 6.0, the constructor is prefixed; you will need to use MozWebSocket()"
    window.WebSocket = window.WebSocket || window.MozWebSocket;

    // establish connection
    common.logMessage("[WEBSOCKETCLIENT] initiating connection to host: " + settings.ws_host + " - port: " + settings.ws_port);
    ws = new WebSocket('ws://' + settings.ws_host + ':' + settings.ws_port);

    // occurs when connection is established
    ws.onopen = function () { common.logMessage("[WEBSOCKETCLIENT] connection successfully established with server"); };

    // occurs when connection is closed.
    ws.onclose = function () { common.logMessage("[WEBSOCKETCLIENT] connection closed"); common.reloadPage(2000); };

    // occurs when error occurs when there's a communication issue (untested yet cause it never occured)
    ws.onerror = function (event) {
      common.logMessage("[WEBSOCKETCLIENT] error occured: " + event.code);
      common.logMessage("[WEBSOCKETCLIENT] reason: " + event.reason);
      common.logMessage("[WEBSOCKETCLIENT] data: " + event.data);
    };

    // occurs when client receives data from server
    ws.onmessage = function (message) {
      common.logMessage("[WEBSOCKETCLIENT] data received from server");

      // ensure data can be "transformed" to JSON
      try {
        var data = JSON.parse(message.data);
      } catch (e) {
        common.logMessage("[WEBSOCKETCLIENT] it doesn't look like JSON: " + message.data);
        return;
      }

      // handling data for parsing
      processJSON(data);
    };
  },

  // send message to server
  sendMessage = function(json) {
    common.logMessage("[WEBSOCKETCLIENT] sending data");
    ws.send(JSON.stringify(json));
  },

  // process JSON
  processJSON = function(data) {
    common.logMessage("[WEBSOCKETCLIENT] processing JSON data");

    // ensure action and data have been specified
    if(typeof data.action === 'undefined') { common.logMessage("[WEBSOCKETCLIENT] action is missing in received data"); return; }
    if(data.action != "reload" && typeof data.info === 'undefined') { common.logMessage("[WEBSOCKETCLIENT] info missing in received data"); return; }

    // tasks based on action
    switch(data.action) {
      // populate dashboard menu and pages
      case "schema":
	homeautomation.populateDashboard(data.info);
        break;

      // device status changed
      case "deviceChanged":
        homeautomation.deviceChanged(data.info);
        break;

      // display data as a notification
      case "displayNotification":
        homeautomation.displayNotification(data.info);
        break;

      // dump data
      case "dump":
        homeautomation.displayDump(data.info);
        break;

      // server requested that page be reloaded
      case "reload":
        var delay = null;
        // delay was specified
        if(data.info) { delay = data.info; }
        common.reloadPage(delay);
        break;

      // error message to display
      case "error":
        homeautomation.displayError(data.info);
	break;

      default:
        common.logMessage("[WEBSOCKETCLIENT] unknown action '" + data.action + "' specified in received data");
    }
  };

  // expose functions
  return {
    connect: connect,
    sendMessage: sendMessage
  };

}();
