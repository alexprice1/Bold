var fs = require('fs');
var clc = require('cli-color');

var clcError = clc.red;
var allFiles = [];
var Q = require('q');

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
  API.Q = function(route) {
    var methods = API(route)
    var promises = {};
    for (var i in methods) {
      promises[i] = Q.denodeify(Promise(methods[i]));
    }
    return promises;
  };
  API.version = getCurrentVersion() || '';
  if (API.version) {
    API.version = 'v' + API.version + '/';
  }
  initializeAPI();
  //see if they are using versioning
  //end versioning
  return exports;
};

function Promise(apiMethod) {
  return function(data, session, extras, fn) {
    if (typeof fn !== 'function') {
      fn = function() {};
    }
    apiMethod(data, fn, session, extras);
  }
}

function findCB(args) {
  for (var i = args.length; i--;) {
    if (typeof args[i] === 'function') {
      return args[i];
    }
  }
  return function() {};
}


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
  for (var exportName in fns) {
    (function(fn) {
      API[fileName][exportName] = (function(data,fn2,session,extras) {
        try {
          fn();
        } catch (e) {
          console.log(clcError('Error: with API', serverConfig.api.location + fileName + '\n For function: ' + exportName + '\n ' + e.message));
        }
        return;
      });
    }(fns[exportName]));
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

function getApi(method, api) {
  var This = this;
  This.api = api;
  This.method = method;
  return function(data, fn, session, extras) {
    if (Object.prototype.toString.call(extras) !== '[object Object]') {
      extras = {};
    }
    if (!('connectionType' in extras)) {
      extras.connectionType = 'internal';
    }
    var api = This.api.apply(this, arguments);
    var args = [];
    for (var i in arguments) {
      args.push(arguments[i]);
    }
    return api[This.method].apply(undefined, args);
  }
}

function getAPI2(args) {
  //args are the supplied functions
  var count = 0;
  var argsLength = args.length;
  return function API_CONSTRUCTOR(data, fn, session, extras) {
    middleWare(args, 0, data, fn, session, extras);
  }
}

function middleWare(args, count, data, fn, session, extras) {
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
        middleWare(args, count + 1, data, fn, session, extras);
      }
    }, fn);
  } else {
    args[count](data, fn, session, extras);
  }
}

function createAPIFunction(fn, fileName, exportName) {
  var name = fn.name;
  var fnString = fn.toString();
  var params = fnString.substring(fnString.indexOf('(') + 1, fnString.indexOf(')'));
  if (!(/[a-z]/i.test(params)) && (!name || name != 'API_CONSTRUCTOR')) {
    fn = fn.toString();
    fn = fn.substring(fn.indexOf('{') + 1, fn.lastIndexOf('}'));
    fn = new Function('data', 'fn', 'session', 'extras', fn);
    var newFn = fn;
    fn = function() {
      try {
        return newFn.apply(this, arguments);
      } catch (e) {
        //we do this because the stack is messed up from new Function...
        console.log(clcError('Error: with API', serverConfig.api.location + fileName + '\n For function: ' + exportName + '\n ' + e.message));
      }
    };
  }
  API[fileName][exportName] = function() {
    try {
      return fn.apply(this, arguments);
    } catch (e) {
      console.log('Error with API:', e.stack);
      return fn({
        err: e
      });
    }
  };
}

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
