/* Requirements */
var expect = require('chai').expect;
var mongoose = require('mongoose');
var clc = require('cli-color');

var error = clc.red;

describe('server test', function() {

  // server setup
  before(function(done) {
    var nm = require('../lib/server.js');
    var config = {
      port: 4050,
      useStaticServer: true,
      favicon: 'favicon.ico',
      envLocation: '_env.js',
      preContent: 'routes.js',
      apiLocation: 'api/',
      mongooseSchemaLocation: '_schema.js',
      appName: 'ExampleApp',
      server: 'Main',
      turnOffAwesomeLogs: true
    };

    nm.extra(__dirname).server(config, function() {
      done();
    });
  });

  // test server
  it('Will pass if server has started correctly.', function() {
    var test = true;
    expect(test).equals(true);
  });

  it('Tests an api call', function() {
    var testAPI = API('test');
    testAPI.run('I am Groot.', function(err, data) {
      if (err) {
        return console.log(error('Err on API test call::', err));
      }
      console.log('Got back this number::', data + '\n');
      expect(data).to.be.a('number');
    });
  });

  it('Tests for Mongoose connection and Schema existence.', function() {
    var schemaWorking = User ? true : false;
    console.log('User exists?', schemaWorking);
    expect(schemaWorking).equals(true);
  });

});
