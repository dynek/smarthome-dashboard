// first of all, let's be strict!
"use strict";

// process title
process.title = 'home-automation';
// process timezone
process.env.TZ = 'Europe/Zurich';

// requirements
var common = require('./common');
var httpServer = require('./httpserver');
var webSocketServer = require('./websocketserver');

// activate debug mode
common.setDebug();

// settings passed to webSocketServer.init
var http_root_dir = '/src/frontend',
http_port = 2080,
ws_port = 8888,
hc2_settings = {
  polling     : 5, // seconds
  credentials : "<username>:<password>",
  host        : "<address/hostname>",
  port        : 80
};

// initialize http server
common.logMessage("initializing http server");
httpServer.listen(http_port, http_root_dir);

// initialize websocket server
common.logMessage("initializing websocket server");
webSocketServer.listen(ws_port, hc2_settings);
