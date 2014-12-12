var clc = require('cli-color');
var warn = clc.yellow;

exports.run = function(data, fn, session, extras) {

    console.log(warn('\nThis is the data you sent::'));
    console.log('\t' + data + '\n');

    if (!data) {
        return fn('You did not send any data.');
    }

    var number = Math.random();
    console.log('We are sending back this number::', number);
    return fn(null, number);
};

exports.syncUncaughtException = API2(function(data, fn, session, extras) {
    console.log('syncUncaughtException');
    throw new Error("Sync Exception Called");
    return;
});

//Until we have domains, this test will fail :(
/*exports.asyncUncaughtException = API2(function(data, fn, session, extras) {
    console.log('asyncUncaughtException');
    setTimeout(function() {
      console.log('ASYNC = timeout');
        throw new Error("Async Exception Called");
        return fn(null,'Error called');
    }, 100);
});*/
