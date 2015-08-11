var path = require('path');
var apiDirectory = path.dirname(require.main.filename) + '/api';
var helpers = require('./helpers.js');

function API(file) {}

API.prototype.require = function(string) {
  if(typeof string !== 'string') {
    throw new Error('String required for API.require');
  }
  var folders = string.split('/');
  var functions = folders.pop().split('.');
  var fileName = functions.shift();

  return this.requireFull(folders, functions, fileName);
};

API.prototype.requireFull = function(folders, functions, fileName) {
  if(typeof functions === 'string') {
    functions = [functions];
  }
  if(!Array.isArray(folders) || !Array.isArray(functions) || typeof fileName !== 'string') {
    throw new Error('API.require arguments malformed.');
  }

  var fileDir = apiDirectory+ '/' + folders.join('/') + '/' + fileName + '.js';
  var returnFunction = require(fileDir);

  for(var i = 0; i < functions.length; i++) {
    var func = functions[i];
    if(typeof returnFunction === 'object' &&  returnFunction[func]) {
      returnFunction = returnFunction[func];
    } else {
      throw new Error('The function ' + func + ' is not in ' + fileDir);
    }
  }

  if(typeof returnFunction === 'function') {
    return returnFunction;
  } else if(typeof returnFunction === 'object' && typeof returnFunction.api === 'function') {
    return modifiedApiFunction(returnFunction);
  } else {
    throw new Error('This is not a valid Bold function.');
  }
};


function modifiedApiFunction(api) {

  var middleware = toArray(api.middleware);
  var mainFunction = api.api;
  var afterware = toArray(api.afterware);
  return function(data, fn, session, extras) {
    callMiddleware(middleware, 0, data, fn, session, extras, function() {
      mainFunction(data, function(err, data) {
        fn(err, data);
        callMiddleware(afterware, 0, data, fn, session, extras);
      }, session, extras);
    });
  }
}

function callMiddleware(middleware, index, data, fn, session, extras, cb) {
  if(typeof cb !== 'function') {
    cb = function(){};
  }
  //if no middleware is provided, just do callback
  if(!middleware[index]) {
    return cb();
  }
  api.require(middleware[index]).call(middleware[index], data, fn, session, extras, function() {
    if(index === middleware.length - 1) {
      if(typeof cb === 'function') {
        cb();
      }
    } else {
      callMiddleware(middleware, index++, data, fn, session, extras, cb)
    }
  });
}

function toArray(item) {
  if(typeof item === 'string') {
    return [item];
  } else if(!item) {
    return [];
  } else {
    return item;
  }
}

var api = new API();

module.exports = api;