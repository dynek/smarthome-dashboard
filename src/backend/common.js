// first of all, let's be strict!
"use strict";

// common module
var common = function() {

  // properties
  var debug = false,

  // activate debug
  setDebug = function() { debug = true; logMessage("debug mode activated"); },

  // log message to browser's console
  logMessage = function(message) { if(debug) { console.log("[LOG] " + new Date() + " - " + message); } };

  // expose functions
  return {
    setDebug: setDebug,
    logMessage: logMessage,
  };

}();

// module exports
module.exports = common;
