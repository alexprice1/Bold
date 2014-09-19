var clc = require('cli-color');

var warn = clc.yellow;

exports.run = function() {

  console.log(warn('\nThis is the data you sent::'));
  console.log('\t' + data + '\n');

  if (!data) {
    return fn('You did not send any data.');
  }

  var number = Math.random();
  console.log('We are sending back this number::', number);
  return fn(null, number);
};
