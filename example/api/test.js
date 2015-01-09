var clc = require('cli-color');
var warn = clc.yellow;

var middleware = API('middleware');
var afterware = API('afterware');

exports.run = API2(middleware.fakeCredentials, function(data, fn, session, extras) {

  console.log(warn('\nThis is the data you sent::'));
  console.log('\t' + data + '\n');

  if (!data) {
    return fn('You did not send any data.');
  }

  var number = Math.random();
  console.log('We are sending back this number::', number);
  return fn(null, number);

});
