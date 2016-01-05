// first of all, let's be strict!
"use strict";

// common module
var common = function() {

  // properties
  var debug = false,

  // activate debug
  setDebug = function() { debug = true; logMessage("[COMMON] debug mode activated"); },

  // are we in debug mode?
  isDebug = function() { return debug; },

  // log message to console
  logMessage = function(message) { if(debug) { console.log("[LOG] " + new Date() + " - " + message); } };

  // expose functions
  return {
    setDebug: setDebug,
    isDebug: isDebug,
    logMessage: logMessage,
  };

}();

// module exports
module.exports = common;
