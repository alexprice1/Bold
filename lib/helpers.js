var path = require('path');
var appDir = path.dirname(require.main.filename);
var fs = require('fs');

module.exports = {
  getFolderTree: function(folder) {
    var dir = appDir + '/' + folder;
    return this.deepFolderCheck(dir);
  },
  deepFolderCheck: function(dir) {
    var self = this;
    var files = fs.readdirSync(dir);
    var fileStruct = {};
    files.forEach(function(file) {
      var fileDir = dir + '/' + file;
      //fileStruct[file] = self.deepFolderMap()
      var stat = fs.lstatSync(fileDir);
      if(stat.isFile()) {
        fileStruct[file.split('.js')[0]] = fileDir;
      } else if(stat.isDirector){
        fileStruct[file] =  self.deepFolderCheck(fileDir);
      }
    });
    return fileStruct;
  }
};
