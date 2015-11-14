// first of all, let's be strict!
"use strict";

// requirements
if(typeof __COMMON_JS === 'undefined') { throw new Error("common.js is required and was not yet loaded!"); }
if(typeof __HOMEAUTOMATION_JS === 'undefined') { throw new Error("homeautomation.js is required and was not yet loaded!"); }

// include guard
if(typeof __WEBSOCKETCLIENT_JS !== 'undefined') { throw new Error("websocketclient.js was already included!"); }
var __WEBSOCKETCLIENT_JS = null;

// websocket client module
var webSocketClient = function() {

    // manage connection to remote server
    var connect = function(settings) {
        common.logMessage("initiating connection to host: " + settings.ws_host + " - port: " + settings.ws_port);

	// for mozilla: "Starting in Gecko 6.0, the constructor is prefixed; you will need to use MozWebSocket()"
        window.WebSocket = window.WebSocket || window.MozWebSocket;

        // establish connection
        var ws = new WebSocket('ws://' + settings.ws_host + ':' + settings.ws_port);

        // occurs when connection is established
        ws.onopen = function () { common.logMessage("connection successfully established with server"); };

        // occurs when connection is closed.
	ws.onclose = function () { common.logMessage("connection closed"); common.reloadPage(2000); };

        // occurs when error occurs when there's a communication issue (untested yet)
	ws.onerror = function (event) {
            common.logMessage("error occured: " + event.code);
            common.logMessage("reason: " + event.reason);
            common.logMessage("data: " + event.data);
	};

        // occurs when client receives data from server
        ws.onmessage = function (message) {
	    common.logMessage("data received from server");
	    try {
	       var data = JSON.parse(message.data);
	    } catch (e) {
	       common.logMessage("it doesn't look like JSON: " + message.data);
	       return;
	    }
	    // handling message to homeautomation
	    homeautomation.processJSON(data);
        };
    };

    // expose functions
    return {
        connect: connect,
    };

}();
