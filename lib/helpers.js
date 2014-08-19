var fs = require('fs');
var clc = require('cli-color');

var clcError = clc.red;
var allFiles = [];

exports.makeGlobal = function(config, mongoose, io) {
  GLOBAL.serverConfig = config;
  GLOBAL.mongoose = mongoose;
  GLOBAL.io = io;
  GLOBAL.Schema = mongoose.schema;
  for (var i in Schema) {
    GLOBAL[i] = Schema[i];
  }
  GLOBAL.servers = config.servers;
  GLOBAL.ObjectId = mongoose.Types.ObjectId;
  return exports;
}

exports.useAPIOutsideOfHTTP = function() {
  GLOBAL.API = function(route) {
    if (!route) {
      return {};
    }
    route = rootUrl + '/' + serverConfig.apiLocation + route;
    var api;
    var methods;
    try {
      api = require(route + '.js');
      methods = api();
    } catch (err) {
      console.log(clcError('Error on API usage::', err));
      var err = 'Either this API does not exist, or you are requiring this API from a file that might currently being using this API';
      throw new Error(err);
    }
    var returnFunctions = {};
    for (var method in methods) {
      returnFunctions[method] = new getApi(method, api);
    }
    return returnFunctions;

  }

  function getApi(method, api) {
    var This = this;
    This.api = api;
    This.method = method;
    return function(data, fn) {
      var api = This.api(data, fn);
      var args = [];
      for (var i in arguments) {
        args.push(arguments[i]);
      }
      return api[This.method].apply(undefined, args);
    }
  }
  return exports;
}
