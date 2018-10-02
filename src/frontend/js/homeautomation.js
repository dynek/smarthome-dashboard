// first of all, let's be strict!
"use strict";

// requirements
if(typeof __COMMON_JS === 'undefined') { throw new Error("[HOMEAUTOMATION] common.js is required and was not yet loaded!"); }

// include guard
if(typeof __HOMEAUTOMATION_JS !== 'undefined') { throw new Error("[HOMEAUTOMATION] homeautomation.js was already included!"); }
var __HOMEAUTOMATION_JS = null;

// home automation module
var homeautomation = function() {

  // variables
  var MAX_STORAGE_ITEMS = 40, // "constant"
  DEVICE_TYPE_TO_HIDE = [ "com.fibaro.netatmoController", "com.fibaro.ipCamera", "com.fibaro.heatDetector", "com.fibaro.FGMS001", "com.fibaro.FGSS001", "com.fibaro.FGFS101", "virtual_device" ], // "constant"
  TOUCH_TIMEOUT = 60, // 60 seconds
  devices = {},
  storage = {},
  timeoutHandle,

  // sorting for what comes out the fibaro box
  sortFunc = function(a, b) { return a.sortOrder - b.sortOrder; },

  clearDashboard = function () {
    // clear menu to inject new elements
    $("#menu").empty();

    // clear containers to inject new elements
    $("#containers").empty();

    // clear variable(s)
    devices = {};

    common.logMessage("[HOMEAUTOMATION] cleared Dashboard");
  },

  // device changed status
  deviceChanged = function(data) {
    // check if value or value2 was passed
    var whichValue = "";
    if(typeof data.value2 !== 'undefined') { whichValue = "2"; }

    common.logMessage("[HOMEAUTOMATION] device " + data.id + " has changed status/value" + whichValue + " to " + data["value" + whichValue]);

    // ensure we know device
    if(typeof devices[data.id] === 'undefined') {
      common.logMessage("[HOMEAUTOMATION] but device is unknown or hidden using DEVICE_TYPE_TO_HIDE");
      return;
    }

    // different action based on device type
    switch(devices[data.id].type) {
      case "com.fibaro.binarySwitch":
        // change checkbox status
        $("#dev-" + data.id).prop("checked", data.value === "0" ? false : true);
        break;

      case "com.fibaro.multilevelSwitch":
      case "com.fibaro.FGRM222":
        // workaround bug when level is 0% but reported as ~0% by Fibaro HC2
        if(data["value" + whichValue] <= 1) {
          data["value" + whichValue] = 0;
          common.logMessage("[HOMEAUTOMATION] !!! corrected to " + data["value" + whichValue]);
        }
        // workaround bug when level is 100% but reported as ~100% by Fibaro HC2
        if(data["value" + whichValue] >= 96) {
          data["value" + whichValue] = 100;
          common.logMessage("[HOMEAUTOMATION] !!! corrected to " + data["value" + whichValue]);
        }

        // change slider value
	$("#dev-" + data.id + (whichValue.length === 0 ? "" : "-" + whichValue)).val(data["value" + whichValue]);
	$("#dev-" + data.id + (whichValue.length === 0 ? "" : "-" + whichValue) + " .noUi-handle").text(data["value" + whichValue]);
        break;

      case "com.fibaro.temperatureSensor":
      case "com.fibaro.lightSensor":
      case "com.fibaro.multilevelSensor":
      case "com.fibaro.humiditySensor":
        // create array for device ID if it doesn't exist yet
	if(typeof storage[data.id] === 'undefined') { storage[data.id] = []; }

        // if max number of items to keep is reached, remove one before adding the latest value
        if(storage[data.id].length == MAX_STORAGE_ITEMS) { storage[data.id].shift(); }

        // add new value into array
        storage[data.id].push({
          timestamp: new Date(),
          value: data.value
        }); 

	// change value displayed
	$("#sensor-" + data.id).text(data.value);
        break;
      case "com.fibaro.doorSensor":
        // remove all classes and add the one we are interested in
        $("#door-" + data.id).removeClass().addClass(data.value == false ? "text-success" : "text-danger"); 
	// change text
        $("#door-" + data.id).html(data.value == false ? "ferm&eacute;e" : "ouverte");
        break;
    }
  },

  // add menu item
  addMenuItem = function(id, name) {
    // create menu item
    $("#menu").append("<li class=\"waves-effect\">\
    <a class=\"menu-item\" href=\"#\" id=\"menu-" + id + "\" data-id=\"" + id + "\">" + name + "</a>\
    </li>");
  },

  // add menu dropdown item
  addMenuDropDownItem = function(id, name) {
    $("#menu").append("<li class=\"dropdown\">\
    <div class=\"waves-effect\" data-toggle=\"dropdown\">" + name + "</div>\
    <ul class=\"dropdown-menu\" id=\"menu-" + id + "\">\
    </ul>\
    </li>");
  },

  // add sub menu item
  addMenuDropDownSubItem = function(id, name, intoID) {
    $("#menu-" + intoID).append("<li>\
    <a class=\"menu-item submenu-item\" href=\"#\" data-id=\"" + id + "\">" + name + "</a>\
    </li>");
  },

  // add page (as opposed to rooms)
  addPage = function(id, title) {
    // add menu item
    addMenuItem(id, title);

    // create page
    $("#containers").append("<div class=\"pages\" id=\"cont-" + id + "\">\
    <div class=\"block-header\">\
    <h2>" + title + "</h2>\
    </div>\
    <div class=\"row\">\
    </div>\
    </div>");
  },

  // add room
  addRoom = function(id, title) {
    $("#containers").append("<div class=\"pages\" id=\"cont-" + id + "\">\
    <div class=\"block-header\">\
    <h2>" + title + "</h2>\
    </div>\
    </div>");
  },

  // add device in room
  addDevice = function(id, name, type, roomID, visible, value, value2) {
    // check that we want to display device
    if(visible === true) {
      // manage different types of devices
      switch(type) {
        case "com.fibaro.binarySwitch":
          var checked = '';
          if(value == "true") { checked = ' checked'; }
          common.appendContent(roomID, "<div class=\"col-lg-3\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + name + "</div>\
	  <div class=\"toggle-switch\" data-color=\"amber\">\
          <input class=\"onOff\" data-id=\"" + id + "\" id=\"dev-" + id + "\" type=\"checkbox\" hidden=\"hidden\"" + checked + ">\
          <label for=\"dev-" + id + "\" class=\"ts-helper\"></label>\
	  </div>\
	  </div>\
	  </div>\
	  </div>");
          break;

        case "com.fibaro.binarySwitch#pushButton":
          common.appendContent(roomID, "<div class=\"col-lg-3\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + name + "</div>\
	  <button class=\"btn btn-primary btn-lg waves-effect btn-push\" data-id=\"" + id + "\">Appuyer</button>\
	  </div>\
	  </div>\
	  </div>");
          break;

        case "com.fibaro.multilevelSwitch":
          common.appendContent(roomID, "<div class=\"col-lg-6\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + name + "</div>\
          <div class=\"input-slider\" id=\"dev-" + id + "\" data-id=\"" + id + "\" data-color=\"amber\" data-start=\"" + value + "\" data-step=\"5\" ></div>\
	  </div>\
	  </div>\
	  </div>");
	  break;
	
	case "com.fibaro.FGRM222":
	  common.appendContent(roomID, "<div class=\"col-lg-6\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\"><span class=\"glyphicon glyphicon-sort-by-attributes pull-left\" aria-hidden=\"true\"></span>" + name + "<span class=\"glyphicon glyphicon glyphicon-transfer pull-right\" aria-hidden=\"true\"></span></div>\
          <div class=\"row\">\
          <div class=\"col-lg-6\">\
          <div class=\"input-slider\" id=\"dev-" + id + "\" data-id=\"" + id + "\" data-start=\"" + value + "\" data-step=\"5\" ></div>\
          </div>\
          <div class=\"col-lg-6\">\
          <div class=\"input-slider\" id=\"dev-" + id + "-2\" data-id=\"" + id + "\" data-start=\"" + value2 + "\" data-step=\"5\" data-value=\"value2\"></div>\
          </div>\
          </div>\
	  </div>\
	  </div>\
	  </div>");
          break;

	case "com.fibaro.temperatureSensor":
	case "com.fibaro.lightSensor":
	case "com.fibaro.multilevelSensor":
	case "com.fibaro.humiditySensor":
	  common.appendContent(roomID, "<div class=\"col-lg-3\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + name + "</div>\
	  <h3 class=\"graph-btn\" id=\"sensor-" + id + "\" data-id=\"" + id + "\">" + value + "</h3>\
	  </div>\
	  </div>\
	  </div>");
          break;

        case "com.fibaro.doorSensor":
	  common.appendContent(roomID, "<div class=\"col-lg-3\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + name + "</div>\
	  <h3 class=\"" + (value === "false" ? "text-success" : "text-danger") +"\" id=\"door-" + id + "\">" + (value === "false" ? "ferm&eacute;e" : "ouverte")  + "</h3>\
	  </div>\
	  </div>\
	  </div>");
          break;

	default:
          common.appendContent(roomID, "<div class=\"col-lg-3\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + id + " - " + name + "</div>\
	  <div>" + type + "</div>\
	  <div>" + value + "</div>\
	  <div>" + JSON.stringify(storage[id]) + "</div>\
	  </div>\
	  </div>\
	  </div>");
	  break;

      }
    }
  },


  // add scenes to page
  addScene = function(data) {
    // if scene is visible, is not running by itself and doesn't have any trigger
    if(data.visible === true && data.autostart === false && data.hasTriggers === false) {
      common.appendContent("scenes", "<div class=\"col-lg-4\">\
	  <div class=\"card\">\
	  <div class=\"card-body card-body-small card-padding card-center\">\
	  <div class=\"lv-header\">" + data.name + "</div>\
	  <button class=\"btn btn-primary btn-lg waves-effect btn-scenes\" data-id=\"" + data.id + "\">executer</button>\
	  </div>\
	  </div>\
	  </div>");
    }
  },

  // display page
  displayPage = function(pageId) {
    // by default, hide overlay when moving page
    $("#overlay").addClass("hide");

    // all dropdown menus inactive first
    $(".dropdown-menu").each(function() {
      $(this).parent().removeClass("active");
    });

    // make active selected item
    $(".menu-item").each(function() {
      if($(this).data("id") !== pageId) {
        $(this).parent().removeClass("active");
      } else {
        $(this).parent().addClass("active");
        // activate dropdown menu (man, this is ugly)
        if($(this).attr('class').toLowerCase().indexOf("submenu-item") >= 0) {
          $(this).parent().parent().parent().addClass("active");
        }
      }
    });

    // hide all rooms except one selected
    $(".pages").each(function() {
      if(this.id !== "cont-" + pageId) {
        $(this).addClass("hide");
      } else {
        $(this).removeClass("hide");
      }
    });
  },

  // configure menu actions
  configureMenuActions = function() {
    // action when menu item is pressed
    $(".menu-item").click(function() {
      displayPage($(this).data("id"));
    });
  },

  // configure form elements actions
  configureFormElementsActions = function() {
    // sliders
    if($('.input-slider')[0]) {
      $('.input-slider').each(function(){
        var isStart = $(this).data('start');
        var isStep = $(this).data('step');

        // workaround bug when level is 0% but reported as ~0% by Fibaro HC2
        if(isStart <= 1) { isStart = 0; }

	// workaround bug when level is 100% but reported as ~100% by Fibaro HC2
        if(isStart >= 96) { isStart = 100; }

        $(this).noUiSlider({
          start: isStart,
	  step: isStep,
          range: {
            'min': 0,
            'max': 100,
          },
        });

        // display value in slider's handle
	$("#" + this.id + " .noUi-handle").text(isStart);
      }).on('slide', function (handle, value) {
        // determine value/value2
        var actionName = "setValue";
        if(typeof $(this).data("value") !== "undefined" && $(this).data("value") === "value2") { actionName = "setValue2"; }

        // display value in slider's handle
	$("#" + this.id + " .noUi-handle").text(parseInt(value, 10));
      }).on('change', function (handle, value) {
        // determine value/value2
        var actionName = "setValue";
        if(typeof $(this).data("value") !== "undefined" && $(this).data("value") === "value2") { actionName = "setValue2"; }

        // set value
        webSocketClient.sendMessage({ action: actionName, info: { id: $(this).data("id"), value: value } });
      });
    }

    // action when on/off switch is pressed
    $(".onOff").click(function() {
      // check status of checkbox
      if($(this).prop("checked") === false) {
        // turn off switch
        webSocketClient.sendMessage({ action: "turnOff", info: $(this).data("id") });
      } else {
        // turn on switch
        webSocketClient.sendMessage({ action: "turnOn", info: $(this).data("id") });
      }
      // do not switch toggle immediately but instead leave it to the feedback from HC2 to change its status from deviceChanged
      return false;
    });

    // display overlay and chart
    $(".graph-btn").click(function() {
      var deviceId = $(this).data("id");

      // check if values exist for device
      if(typeof storage[deviceId] === 'undefined' || storage[deviceId].length <= 1) { return false; }

      // graph data
      var tmpData = {
        labels: [],
        datasets: [{
          label: "dataset",
          fillColor: "rgba(220,220,220,0.2)",
          strokeColor: "rgba(220,220,220,1)",
          pointColor: "rgba(220,220,220,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(220,220,220,1)",
          data: []
        }]
      };

      // populate labels and values
      $.each(storage[deviceId], function(key, value) {
        // transform date
        var d = new Date(value.timestamp);
        var date = ('0' + d.getDate()).slice(-2) + "." + ('0' + (d.getMonth() + 1)).slice(-2) + " - " + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2);

        // push date and value
        tmpData.labels.push(date);
        tmpData.datasets[0].data.push(value.value);
      });

      // empty overlay and add popup div + chart canvas
      $("#overlay").empty().append("<div class=\"popup\"><canvas id=\"chart\" /></div>");

      // show overlay
      $("#overlay").removeClass("hide");

      // create chart
      new Chart($("canvas#chart").get(0).getContext("2d")).Line(tmpData, {
        responsive: true,
        maintainAspectRatio: true,
        bezierCurve: true,
	scaleLabel: function (value) { return Math.round(value.value*10)/10; }
      });
    });

    // hide overlay
    $("#overlay").click(function() { $("#overlay").addClass("hide"); });

    // display informations page
    displayPage("informations");

    // "run" for push buttons
    $(".btn-push").click(function() {
      // required for setTimeout
      var btn = $(this);

      // disable button
      btn.prop("disabled", true);

      // request scene execution
      webSocketClient.sendMessage({ action: "turnOn", info: $(this).data("id") });

      // in x seconds enable button
      setTimeout(function () { btn.prop("disabled", false); }, 10000);
    });

    // scenes "run" buttons
    $(".btn-scenes").click(function() {
      // required for setTimeout
      var btn = $(this);

      // disable button
      btn.prop("disabled", true);
      
      // request scene execution
      webSocketClient.sendMessage({ action: "executeScene", info: $(this).data("id") });

      // in x seconds enable button
      setTimeout(function () { btn.prop("disabled", false); }, 2000);
    });

    // when nothing is clicked for x seconds, let's move to information page
    $("body").click(function(){
      clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(function() { displayPage("informations"); }, TOUCH_TIMEOUT * 1000);
    }); 

    // every x seconds / minutes, let's check if modules all reported their values since x seconds / minutes
    checkElapsedTime();
  },

  // check if modules recently reported their value
  checkElapsedTime = function() {
    common.logMessage("[HOMEAUTOMATION] running checkElapsedTime");
    $.each(storage, function(deviceId, values) {
      if($("#sensor-" + deviceId).length) {
        var elapsedTime = Math.floor(((new Date).getTime() - Date.parse(values[values.length-1].timestamp)) / 1000);
        if(elapsedTime > 43200) {
          common.logMessage("[HOMEAUTOMATION] device/sensor #" + deviceId + " hasn't reported its value since " + elapsedTime + " seconds");
          $("#sensor-" + deviceId).text("N/A");
        }
      }
    });
    setTimeout(function() { checkElapsedTime(); }, 900000);
  },

  // populate menu and pages
  populateDashboard = function(data) {
    // clear menu and pages
    clearDashboard();

    // storage (values we want to keep to graph them, e.g. temperature)
    if(typeof data["/storage"] !== 'undefined') { storage = data["/storage"]; }

    // add informations page with corresponding menu entry
    addPage("informations", "Informations");

    // plugins
    plugin_forecast.getForecast(true);
    plugin_calendar.getCalendar();

    // add scenes page with corresponding menu entry
    if(typeof data["/api/scenes"] !== 'undefined') {
      addPage("scenes", "Scenes");

      // add scenes to page
      $.each(data["/api/scenes"].sort(sortFunc), function(key, value) { addScene(value); });
    }

    // add sections of house
    $.each(data["/api/sections"].sort(sortFunc), function(key, value) {
      // number of rooms in section
      var matches = common.objGrep(data["/api/rooms"], "sectionID", value.id);
      
      // we don't want to display section->room using dropdown menu for one single room with same name as its section
      if(matches.length == 1 && value.name === matches[0].name) {
        // create array for device ID if it doesn't exist yet
	if(typeof storage["folding"] === 'undefined') { storage["folding"] = []; }

	// push section id to remember we want to fold it
        storage["folding"].push(value.id);
      } else if(matches.length > 1) {
        // create dropdown menu for section
        addMenuDropDownItem(value.id, value.name);
      }
    });

    // inject rooms in sections and create corresponding pages
    $.each(data["/api/rooms"].sort(sortFunc), function(key, value) {
      // if we want to fold, add regular page
      if(storage["folding"].indexOf(value.sectionID) >= 0) {
        addPage(value.id, value.name);
      } else {
        // add sub menu item in corresponding house section
        addMenuDropDownSubItem(value.id, value.name, value.sectionID);

        // add room (similar to pages)
        addRoom(value.id, value.name);
      }
    });

    // inject devices in rooms
    $.each(data["/api/devices"].sort(sortFunc), function(key, value) {
      // ensure we want to show device
      if(DEVICE_TYPE_TO_HIDE.indexOf(value.type) === -1) {
        // save devices information for later use
        devices[value.id] = { "name": value.name, "type": value.type, "roomID": value.roomID };

        // if device is a binary switch with "push button" in the description, I'm assuming it's a push button and not regular on/off
        if(value.type == "com.fibaro.binarySwitch" && value.properties.userDescription.match(/push button/i)) {
	  // creating my type of push button :-)
          value.type = "com.fibaro.binarySwitch#pushButton";
	}

        // add device in room
        addDevice(value.id, value.name, value.type, value.roomID, value.visible, value.properties.value, value.properties.value2);
      }
    });

    // configure actions
    configureMenuActions();
    configureFormElementsActions();

    common.logMessage("[HOMEAUTOMATION] done populating Dashboard and actions");

    // fadeOut page loader
    setTimeout (function() { $('.page-loader').fadeOut(); }, 250);
  },

  // display raw message
  displayDump = function(data) {
    common.logMessage("[HOMEAUTOMATION] received data to dump - creating menu entry to display dump");

    // add page and corresponding menu item
    //WIP IF NOT EXIST YET
    addPage("dump", "Dump");

    // add dump into page
    common.appendContent("dump", "<pre>" + JSON.stringify(data, null, 2) + "</pre>");

    // configure menu actions
    configureMenuActions();
  },

  // display error message
  displayError = function(message) {
    // hide header
    $("#header-2").addClass("hide");

    // fadeOut page loader
    setTimeout (function () { $('.page-loader').fadeOut(); }, 500);

    // empty overlay and add popup div + chart canvas
    $("#overlay").empty().append("<div class=\"popup-error\">" + message + "</div>");

    // show overlay
    $("#overlay").removeClass("hide");
  },

  // display notification
  displayNotification = function(data) {
    common.logMessage("[HOMEAUTOMATION] received notification to display on-screen");

    $.growl({
      message: data.message
    },{
      type: data.type,
      allow_dismiss: false,
      placement: {
        from: 'top',
        align: 'right'
      },
      delay: 5000,
      offset: {
        x: 20,
        y: 170
      }
    });
  };

  // expose functions
  return {
    deviceChanged: deviceChanged,
    populateDashboard: populateDashboard,
    displayNotification: displayNotification,
    displayDump: displayDump,
    displayError: displayError,
  };

}();
