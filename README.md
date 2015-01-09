[![NPM version][npm-version-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url] [![Build Status][travis-image]][travis-url]

# Novation-Mobile

Novation-Mobile is a framework using a NodeJS/MongoDB + Mongoose/Socket.IO/Redis stack. It was built by [Novation Mobile](http://www.novationmobile.com) to create scaleable Node.js servers with an emphasis on quick, standardized development.

Get the source from [GitHub](https://github.com/chapinkapa/novation-mobile) or install via NPM

    npm install novation-mobile --save

**Note:** this will take a while. We include all the dependencies to run this.

## Version

0.5.0

## How to use

In a web.js file at your project root, use the following to set up a novation-mobile server:

    var nm = require('novation-mobile');

    var config = {
      appName: 'ExampleApp',
      server: 'Main',
      port: process.argv[2] || 4050,
      useStaticServer: true,
      favicon: 'favicon.ico',
      envLocation: '_env.js',
      preContent: 'routes.js',
      postContent: 'routes2.js',
      mongooseSchemaLocation: '_schema.js',
      viewEngine: 'jade',
      viewDirectory: 'views',
      publicDirectory: 'public',
      servers: ['Main:' + os.hostname()],
      logger: {
        userName: '',
        password: ''
      },
      api: {
        location: 'api'
      },
      onlineUsersConfig: {
        timer:900
      }
    };

    nm.extra(__dirname).server(config);

Each option should be customized for your app. 

#### Config Options:

1. **appName**: Name of your app.
1. **server**: Name of the server that the current code is running on.
1. **port:** What port to run server on. Defaults to process.env.PORT and then to 4050.
1. **useStaticServer:** Wether to allow the server to act as a static server for a specified folder. Used with viewEngine, viewDirectory, and publicDirectory. Defaults to true.
1. **favicon:** Location of your favicon. Defaults to 'public'.
1. **[envLocation](#environmental-variables)**: Location of your environmental variables.
1. **[preContent](#routes)**: Location of your routes that run before api routes.
1. **[postContent](#routes)**: Location of your routes that run after api routes.
1. **[mongooseSchemaLocation](#mongoose-schema)**: Location of your mongoose schema. Defaults to '_schema.js'.
1. **viewEngine:** Which view engine to use. Example: jade, html, handlebars, etc.
1. **viewEngine:** Which directory to be used to serve views, if using dynamic views.
1. **publicDirectory:** Which directory to be used as your 'static folder.'
1. **servers**: An array of servers that is used by redis-logger and socket.io-online-users.
1. **logger.username**: username to access the redis-logger
1. **logger.password**: password to access the redis-logger
1. **[api.location](#standard-apis)**: Location of your api folder.
1. **[api.version](#standard-apis)**: The version number the server should use for internal calls.
1. **[api.addSocketsToRoom](#standard-apis)**: A function that is called every API call that allows you to add a socket/user to a room for socket.io. The function has two arguments: (session, socket);
1. **onlineUsersConfig:** An object with configuration options to use socket.io-online-users.
1. **onlineUsersConfig.timer**: The buffer time until the server updates the server with who is online.
1. **ssl**: An object of options to use ssl on your node server.
1. **ssl.key:** Location of key file to use.
1. **ssl.cert:** Location of the cert file to use.
1. **ssl.port:** Port to have your node.js https server run on.
1. **sslRedirect:** Redirect http to https.
1. **dontUseRedisTTL:** do not use a ttl for redis.
1. **ttl:** Time in seconds until redis expires documents. Defaults to 3600.

## Components

### Environmental Variables

##### Location: _env.js

Allows you to set environment variables used throughout the app:

    exports.configureEnvironment = function(app, process) {
      // required variables
      process.env['SESSION_KEY'] = 'my_express.sid';
      process.env['SESSION_SECRET'] = 'exampleSecret';
      process.env['COOKIE_KEY'] = 'ExampleCookie';
      process.env.MONGO_URI = '';
      process.env.REDIS_URI = 'redis://redis:redis@ip:port/dbindex';

      // add your own
      process.env['SOME_API_KEY'] = 'aaa111nnn123';
    };

### Routes

##### Location: routes.js

Allows you to create custom routes for your app.

    exports.content = function(app, io) {
      // you can use this page for additional, custom routes
      app.get('/', function(req, res, next) {
        res.send('This is an example server');
      });
    };

### Standard APIs

##### Location: api/

Allows you to create APIs that can be accessed by both socket.io and by RESTful requests.

Say I want to call the function 'run' under 'SomeAPI'. I can request the API either using ``http://localhost:4050/api/SomeAPI/run`` or by using sockets on the client:

    socket.emit('api', 'SomeAPI', 'run', {
      testData: 'I Am Groot'
    }, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });

The contents of ``api/SomeAPI.js`` then look like:

    exports.run = function() {
      console.log(data.testData); // prints "I Am Groot"

      var number = Math.random();
      if (number < .5) {
        return fn('This is a standard error message.');
      } else {
        return fn(null, {
          data: 'This the standard way to send data back to the client.'
        });
      }
    };

Extras has the following properties:
- ``mongoose`` - access to the mongoose variable.
- ``io``
- ``socket`` - the particular socket connection, if available
- ``connectionType`` - either socket or http.
- ``fileName`` - the file that the API is being hit by. 
- ``req`` - if available
- ``res`` - if available
- ``method`` - the method that is being called.
- ``ipAddress``
- ``hostname``

###### API Middleware Example

    function testSession(data,fn,session,extras,next){
      if(!session){
        return fn("You have to have a session for this.");
      } else {
        return next();
      }
    }

    exports.testSession=API2(testSession,testSession,function(data,fn,session,extras){
      fn(null, 'You have a session!');
    });

    exports.fn=function(){
      fn(null, 'yay!!');
    };

    exports.staticVariacle=1;

## next()

Next allows you to run the next functon in the iteration. If you want to skip all middleware except the last function, run next({
  finish: true
}).

Also, if you use the middleware and do not provide a connectionType in extras, API2 will add 'internal' to the connectionType.

## after()

If you want to run an API after another API is complete, you may add an after() call to the middleware.

    var middleware = API('middleware');
    var afterware = API('afterware');

    exports.run = API2(middleware.checkCredentials, function(data, fn, session, extras) {
    
      if (!data) {
        return fn('You did not send any data.');
      }
    
      var number = Math.random();
      console.log('We are sending back this number::', number);
      return fn(null, number);
    
    });
    
    exports.run.after(afterware.testLog);

In the above example, the ``run()`` API will use middleware to check access credentials. If the credentials middleware finishes successfully, our API does its work. As soon as ``fn(null, number)`` is called, the afterware API called ``eventLog`` is triggered. What happens inside the afterware API has no impact on what the ``run()`` API does. An afterware API gets the parameters ``err, res, data, session, extras``, and might look something like:

    exports.testLog = function(err, res, data, session, extras) {
      if (err) {
        return console.log('The API experienced an error. Log the error to the DB.')
      } else {
        return console.log('We can log the number ' + res + ' to the DB.');
      }
    };

## API Promises

With 0.5.0 we are introducing promises for our APIs. To turn any of our APIs as a promise, run API.Q.
Although it should be compatible with several promise libraries, I recommend using the module, [q](https://www.npmjs.org/package/q).

    var User = API.Q('User');
    
    User.getData({},'session','extras').then(function(){
      console.log('success',arguments);
    },function(){
      console.log('fail',arguments);
    });

### Mongoose Schema

##### Location: schema.js

Allows you to create a mongoose schema that can be used throughout your app. Configure your file to look like this:

    var mongoose = require('mongoose');
    var Schema = mongoose.Schema;

    exports.User = mongoose.model('User', new Schema({
      firstName: String,
      lastName: String,
      fullName: String
    }));

**Note:** everything you export in here will be attached to the global scope. It will be accessible throughout your whole server.


[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[license-url]: https://github.com/chapinkapa/novation-mobile/blob/master/LICENSE

[npm-version-image]: http://img.shields.io/npm/v/novation-mobile.svg?style=flat-square
[npm-downloads-image]: http://img.shields.io/npm/dm/novation-mobile.svg?style=flat-square
[npm-url]: https://npmjs.org/package/novation-mobile

[travis-image]: http://img.shields.io/travis/chapinkapa/novation-mobile.svg?style=flat-square
[travis-url]: http://travis-ci.org/chapinkapa/novation-mobile