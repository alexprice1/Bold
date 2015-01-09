var fs = require('fs');
var clc = require('cli-color');

var clcError = clc.red;
var allFiles = [];

exports.makeGlobal = function(config, mongoose, io) {
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

exports.attachAPI = function() {

  GLOBAL.API2 = function() {
    return new getAPI2(arguments);
  };

  GLOBAL.API = function(route) {
    var originalRoute = route;
    if (!route) {
      return {};
    }
    route = GLOBAL.API.version + route;
    var api;
    var methods;
    try {
      methods = API[route];
    } catch (err) {
      console.log(clcError('Error on API usage::', err));
      var err = 'Either this API does not exist, or you are requiring this API from a file that might currently being using this API';
      throw new Error(err);
    }
    if (!methods) {
      try {
        methods = projRequire(serverConfig.api.location + route + '.js');
      } catch (err) {
        console.log(clcError('Error on API usage::', err));
        var err = 'Either this API does not exist, or you are requiring this API from a file that might currently being using this API';
        throw new Error(err);
      }
    }
    return methods;
  };

  API.version = getCurrentVersion() || '';
  if (API.version) {
    API.version = 'v' + API.version + '/';
  }
  initializeAPI();
  // see if they are using versioning
  // end versioning
  return exports;
};

function initializeAPI() {
  var files = getAllFilesFromDirectory(serverConfig.api.location);
  for (var i in files) {
    var file = files[i];
    initializeFilesAPIS(file);
  }
}

function initializeFilesAPIS(file, ext) {
  if (file.indexOf('.js') == -1) {
    return;
  }
  var fileName = file.replace(rootUrl + '/' + serverConfig.api.location, '').replace(serverConfig.api.location, '').replace('.js', '');
  var fns = require(file);
  API[fileName] = {};
  for (var k in fns) {
    var fn = fns[k];
    API[fileName][k] = fn;
  }
}

function getCurrentVersion() {
  if (serverConfig.api.version) {
    return serverConfig.api.version;
  }
  var dir = rootUrl + '/' + serverConfig.api.location;
  var files = fs.readdirSync(dir);
  var dirs = [];
  var regex = /^[0-9]+$/;
  var currentVersion;
  for (var i in files) {
    var file = files[i];
    var version = file.slice(1, file.length);
    if (file[0] != '.' && file[0] == 'v' && regex.test(version)) {
      var filePath = dir + file;
      stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (!currentVersion) {
          currentVersion = 0;
        }
        if (version > currentVersion) {
          currentVersion = version;
        }
      }
    }
  }
  return currentVersion;
}

function getAPI2(args) {
  var self = this;
  // args are the supplied functions
  function API_CONSTRUCTOR(data, fn, session, extras) {
    self.middleWare(args, 0, data, fn, session, extras);
  };
  API_CONSTRUCTOR.after = function(afterFunctions) {
    self.afterFunctions = afterFunctions;
  };
  return API_CONSTRUCTOR;
}

getAPI2.prototype.middleWare = function(args, count, data, fn, session, extras) {
  var self = this;
  if (typeof extras != 'object') {
    extras = {
      connectionType: 'internal'
    };
  }
  if (count + 1 != args.length) {
    args[count](data, fn, session, extras, function(opts) {
      if (typeof opts === 'object' && opts.finish === true) {
        args[args.length - 1](data, fn, session, extras);
      } else {
        self.middleWare(args, count + 1, data, fn, session, extras);
      }
    }, fn);
  } else {
    args[count](data, function(err, res) {
      if (self.afterFunctions) {
        self.afterFunctions(err, res, data, session, extras);
      }
    }, session, extras);
  }
};

function getAllFilesFromDirectory(dir) {
  var fs = require('fs');
  var results = [];
  if (dir.indexOf(rootUrl) != 0) {
    dir = rootUrl + '/' + dir;
  }
  fs.readdirSync(dir).forEach(function(file) {
    if (dir[dir.length - 1] !== '/') {
      file = dir + '/' + file;
    } else {
      file = dir + file;
    }
    var stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFilesFromDirectory(file))
    } else results.push(file);
  });
  return results
}
