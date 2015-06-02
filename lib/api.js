var path = require('path');
var apiDirectory = path.dirname(require.main.filename) + '/api';

function API(file) {
  if(this === GLOBAL) {
    return new API(file);
  }
  var helpers = require('./helpers.js');

  this.validApiRoutes = helpers.getFolderTree('api');
}

API.prototype.require = function(string) {
  var self = this;
  var folders = string.split('/');
  var functions = folders.pop().split('.');
  var file = functions.shift();
  
  var fileRoute = this.validApiRoutes;

  returnFunction = require(apiDirectory + '/' + folders.join('/') + '/' + file + '.js');

  functions.forEach(function(func) {
    returnFunction = returnFunction[func];
  });
  return returnFunction;
};

module.exports = API;