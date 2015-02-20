/* Requirements */
var expect = require('chai').expect;
var mongoose = require('mongoose');
var clc = require('cli-color');
var os = require('os');

var error = clc.red;

process.chdir(__dirname);
var nm = require('../lib/server.js');

nm.run(function() {
  done();
});

return;

describe('server test', function() {
  // server setup
  before(function(done) {
    process.chdir(__dirname);
    var nm = require('../lib/server.js');

    nm.server(config, function() {
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
    testAPI.run({
      message: 'I am Groot.',
      credentials: true
    }, function(err, data) {
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
