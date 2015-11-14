// first of all, let's be strict!
"use strict";

// requirements
if(typeof __COMMON_JS === 'undefined') { throw new Error("common.js is required and was not yet loaded!"); }

// include guard
if(typeof __HOMEAUTOMATION_JS !== 'undefined') { throw new Error("homeautomation.js was already included!"); }
var __HOMEAUTOMATION_JS = null;

// home automation module
var homeautomation = function() {

  // process JSON
  var processJSON = function(json) {
    common.logMessage("processing JSON data");

    // ensure action and data have been specified
    if(typeof json.action === 'undefined') { throw new Error("action is missing in received json"); }
    if(json.action != "reload" && typeof json.data === 'undefined') { throw new Error("data missing in received json"); }

    // tasks based on action
    switch(json.action) {
      // server requested that page be reloaded
      case "reload":
        common.reloadPage();
        break;

      // as an example, printing data
      case "print":
        $("#container").append("<pre>" + JSON.stringify(json.data, null, 2) + "</pre>");
        break;

      default:
        throw new Error("unknown action '" + json.action + "' specified in received json");
    }
  };

  // expose functions
  return {
    processJSON: processJSON,
  };

}();
