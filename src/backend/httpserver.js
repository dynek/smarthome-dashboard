// first of all, let's be strict!
"use strict";

// http server module
var httpServer = function () {

  // variables
  var common = require('./common'),
  httpDomain = require('domain').create(),

  // function managing listening for http traffic (serving index and catching HC2 devices state changes)
  listen = function (port, root) {
    // catch domain error
    httpDomain.on('error', function (err) {
      common.logMessage('[HTTPSERVER] error caught in http domain:' + err);
    });

    // within domain, instanciate http server
    httpDomain.run(function () {
      require('http').createServer(function (req, res) {
        // required to parse URL
        var url = require('url');

        // path to file - parse url
        var pathname = url.parse(req.url).pathname;
        if (pathname == '/') { pathname = '/index.html'; }

        // device changed status
        if (pathname == '/status') {
          // parse query string
          var query_string = url.parse(req.url, true).query;

          // ugly? who said it was :-) let's determine if value or value2 was passed
          var valuetype = null;
          var value = null;
          if(query_string.value) { valuetype = "value"; value = query_string.value; }
          else if(query_string.value2) { valuetype = "value2"; value = query_string.value2; }

          common.logMessage("[HTTPSERVER] " + valuetype + " of device " + query_string.id + " changed to " + value);
          res.writeHead(200, {'content-type': 'text/html'});
          res.write('OK');
          res.end();

          // call function that takes care of device status changes
          require('./homeautomation').deviceChangedStatus(query_string.id, valuetype, value);
        } else {
          // read file on disk and serve it
          common.logMessage("[HTTPSERVER] client requested file: " + pathname);
          require('fs').readFile(root + pathname, function (err, data) {
            if (err) {
              common.logMessage("[HTTPSERVER] file doesn't exist or is not readable!");
              res.writeHead(404, {'content-type': 'text/html'});
              data = 'File not found: ' + pathname;
            }

	    // manage content-type returned
            var extension = pathname.substr((pathname.lastIndexOf('.') +1));
	    var contentType = '';
            switch(extension) {
	      case 'css':
	        contentType = 'text/css';
	        break;
              case 'js':
	        contentType = 'application/javascript';
	        break;
	      case 'svg':
	        contentType = 'image/svg+xml';
		break;
	      case 'ttf':
	        contentType = 'application/octet-stream';
		break;
              case 'woff':
	        contentType = 'application/font-woff';
		break;
              case 'woff2':
	        contentType = 'application/font-woff2';
		break;
	      default:
                contentType = 'text/html';
	    }
            res.writeHead(200, {'content-type': contentType});
            res.write(data);
            res.end();
          });
        }
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
