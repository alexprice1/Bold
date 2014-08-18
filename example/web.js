//you would do:
//var nm = require('novation-mobile');
var nm = require('../lib/server.js');
var config = {
  port: process.argv[2] || 4050,
  useStaticServer: true,
  favicon: '/favicon.ico',
  envLocation: '_env.js',
  preContent: 'routes.js',
  apiLocation: 'api/',
  mongooseSchemaLocation: '_schema.js',
  appName: "ExampleApp",
  server: "Main",
  turnOffAwesomeLogs:true
};

nm.extra(__dirname).server(config);