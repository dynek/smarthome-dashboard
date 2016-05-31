// first of all, let's be strict!
"use strict";

// include guard
if(typeof __COMMON_JS !== 'undefined') { throw new Error("[COMMON] common.js was already included!"); }
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
      this.logMessage("[COMMON] debug mode activated");
    }
  },

  // log message to browser's console
  logMessage = function(message) { if(this.debug) { console.log(message); } },

  // reload page with optional timeout
  reloadPage = function(timeout) {
    if (typeof timeout === 'undefined' || timeout === null || timeout !== parseInt(timeout, 10)) {
      this.logMessage("[COMMON] reloading page straight away");
      timeout = 0;
    } else {
      this.logMessage("[COMMON] reloading page in " + timeout + "ms");
    }
    setTimeout(function(){ window.location.reload() }, timeout);
  },

  // add content into element based on ID starting with "cont-". Anything may follow.
  appendContent = function(id, content) {
    $("#cont-" + id).append(content);
  };
 
  // expose functions
  return {
    setDebug: setDebug,
    logMessage: logMessage,
    reloadPage: reloadPage,
    appendContent: appendContent,
  };

}();
