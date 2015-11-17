// first of all, let's be strict!
"use strict";

// http server module
var httpServer = function () {

  // properties
  var common = require('./common'),
  http = require('http'),
  url = require('url'),
  httpDomain = require('domain').create(),

  listen = function (port, root) {
    // catch domain error
    httpDomain.on('error', function (err) {
      common.logMessage('Error caught in http domain:' + err);
    });

    // within a domain, instanciate http server, have it listen and serve file upon request
    httpDomain.run(function () {
      http.createServer(function (req, res) {
        // path to file
        var pathname = url.parse(req.url).pathname;
        if (pathname == '/') { pathname = '/index.html'; }

        // read file on disk and serve it
        common.logMessage("client requested file: " + pathname);
        require('fs').readFile(root + pathname, function (err, data) {
          if (err) {
            common.logMessage("file doesn't exist or is not readable!");
            res.writeHead(404, {'content-type': 'text/html'});
            data = 'File not found: ' + pathname;
          }
          res.write(data);
          res.end();
        });
      }).listen(port);
    });
  };

  // expose functions
  return {
    listen: listen
  };
}();

// module exports
module.exports = httpServer;
