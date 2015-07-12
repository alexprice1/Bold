#!/usr/bin/env node

var debug = process.env.debug;

var path = require('path');
var dir = process.cwd();

var version = require('../package.json').version;

var program = require('commander');

program
  .version(version)

program
  .command('create [mode]')
  .description('Create a new bold server.')
  .action(createBoldServer);

program.parse(process.argv);

function createBoldServer(name) {
  var ncp = require('ncp').ncp;
  
  ncp.limit = 16;
  var exampleDir = path.join(__dirname, '../', '/example');
  var sourceDir = path.join(__dirname, '../');
  var destinationDir = dir + '/' + name;
  ncp(exampleDir, destinationDir, function (err) {
   if (err) {
     return console.error(err);
   }
   
    console.log('created');
    console.log("run:");
    console.log("'cd " + name + " && sudo npm install && node server'");
  });
}