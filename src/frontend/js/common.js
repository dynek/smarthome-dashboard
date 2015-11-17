// first of all, let's be strict!
"use strict";

// include guard
if(typeof __COMMON_JS !== 'undefined') { throw new Error("common.js was already included!"); }
var __COMMON_JS = null;

// common module
var common = function() {

  // properties
  var debugKeyWord = "debug",
  debug = false,

  // activate debug if query string contains "debug" keyword
  setDebug = function() {
    if(window.location.search.substring(1).indexOf(debugKeyWord) > -1) {
      this.debug = true;
      this.logMessage("debug mode activated");
    }
  },

  // log message to browser's console
  logMessage = function(message) { if(this.debug) { console.log("[LOG] " + message); } },

  // reload page with optional timeout
  reloadPage = function(timeout) {
    if (typeof timeout === 'undefined' || timeout !== parseInt(timeout, 10)) {
      this.logMessage("reloading page straight away");
      timeout = 0;
    } else {
      this.logMessage("reloading page in " + timeout + "ms");
    }
    setTimeout(function(){ window.location.reload() }, timeout);
  };

  // expose functions
  return {
    setDebug: setDebug,
    logMessage: logMessage,
    reloadPage: reloadPage,
  };

}();
