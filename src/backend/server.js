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

// app settings
var http_root_dir = '/src/frontend',
http_port = 2080,
ws_port = 8888,
hc2_settings = {
  credentials : 'admin:password', // username:password
  host        : '192.168.0.56',
  port        : 80,
  myself      : 'nas:2080', // my ip/hostname:port cause running inside docker
  sceneName   : 'NODE-tification', // should be defined once for good or previous one should be manually removed in HC2 web interface
  polling     : 3600, // seconds between <sceneName> updates
  polling_fail: 60 // seconds between <sceneName> updates when previous attempt failed
};

// initialize http server
common.logMessage("[SERVER] initializing http server");
httpServer.listen(http_port, http_root_dir);

// initialize websocket server
common.logMessage("[SERVER] initializing websocket server");
webSocketServer.listen(ws_port, hc2_settings);
