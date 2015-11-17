// first of all, let's be strict!
"use strict";

// requirements
if(typeof __COMMON_JS === 'undefined') { throw new Error("common.js is required and was not yet loaded!"); }
if(typeof __WEBSOCKETCLIENT_JS === 'undefined') { throw new Error("websocketclient.js is required and was not yet loaded!"); }

// include guard
if(typeof __MAIN_JS !== 'undefined') { throw new Error("main.js was already included!"); }
var __MAIN_JS = null;

// activate debug mode if "debug" keyword is found in query string
common.setDebug();

// wait that dom be ready before starting the party
$(document).ready(function () {
  common.logMessage("dom ready");

  // settings passed to webSocketClient.connect
  var settings = {
    ws_host: 'server',
    ws_port: 8888,
  };

  // connect to remote websocket server
  webSocketClient.connect(settings);
});
