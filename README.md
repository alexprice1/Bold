[![NPM version][npm-version-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-url] [![MIT License][license-image]][license-url] [![Build Status][travis-image]][travis-url]

# Bold

Bold is a framework using a NodeJS + Socket.IO/Redis stack.

Get the source from [GitHub](https://github.com/chapinkapa/bold) or install via NPM

    npm install bold --save

**Note:** this will take a while. We include all the dependencies to run bold.

## Notice::

0.1.x will be the last support for Node 0.12 or less. Current supports Node 2.0 >

## Version

0.1.18

## Command Line Tool

Install:

    sudo npm install bold -g
    
Create example server:

    bold create bold-server && cd bold-server

## How to use

We recommend starting off using our command line tool. It will setup the bold server for you. If you want to setup a server manually, follow this guide.


In a server.js file at your project root, use the following to set up a bold server:

  var Bold = require('../lib/bold.js');

  Bold.start(function(port) {
    console.log('My server started on port '+ port);
  });

#### Config Folder:

##### Location: config

Under your app directory, create a folder called 'config'. In there, you can have the following files:

1. config.js (required)
2. routes.js

#### Config.js

##### Location: config/config.js

Under config.js, you can return the following options:

1. **appName**: Name of your app.
1. **server**: Name of the server that the current code is running on.
1. **port:** What port to run server on. Defaults to process.env.PORT and then to 4050.
1. **useStaticServer:** Wether to allow the server to act as a static server for a specified folder. Used with viewEngine, viewDirectory, and publicDirectory. Defaults to true.
1. **favicon:** Location of your favicon. Defaults to 'public'.
1. **viewEngine:** Which view engine to use. Example: jade, html, handlebars, etc.
1. **viewDirectory:** Which directory to be used to serve views, if using dynamic views.
1. **publicDirectory:** Which directory to be used as your 'static folder.'
1. **ssl**: An object of options to use ssl on your node server.
1. **ssl.key:** Location of key file to use.
1. **ssl.cert:** Location of the cert file to use.
1. **ssl.port:** Port to have your node.js https server run on.
1. **sslRedirect:** Redirect http to https.
1. **dontUseRedisTTL:** do not use a ttl for redis.
1. **ttl:** Time in seconds until redis expires documents. Defaults to 3600.

**Note:** each of these configs can be a string, or a function that expects a string to be returned.

#### Routes.js

##### Location: config/routes.js

Allows you to add custom routes. We pass the express 'app' object to this function so you can configure custom routes.

    //Location:
    //config/routes.js

    module.exports = function(app) {
      app.get('/users', function(req, res, next) {
        res.send([{
          firstName: 'Alex',
          lastName: 'Price'
        }]);
      });
    };

#### APIs

##### Location: api/

Allows you to create APIs that can be accessed by both socket.io and by RESTful requests.

Say I want to call the function 'getUsers' under 'user'. I can request the API either using ``http://localhost:4050/api/user/getUser`` or by using socket.io on the client:

    socket.emit('api', 'user', 'getUser', {
      testData: 'I Am Groot'
    }, function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });


Example Api:

    //Location:
    //api/user.js

    var sampleUser = {
      name: 'Alex Price'
    };

    module.exports = {
      getUser: {
        middleware: ['middleware/auth.testCredentials'],
        api: function(data, fn, session, extras) {
          return fn(null, sampleUser);
        },
        afterware: ['middleware/auth.user.logUser']
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

##### Sessions

Sessions use redis for consistency across Node instances and for persistance. To read a session, just use standard dot notation. To write to the session, just write to the session object, and then run session.save():

    //Location:
    //api/user.js

    module.exports = {
      updateUser: {
        middleware: ['middleware/auth.testCredentials'],
        api: function(data, fn, session, extras) {
          var user = session.user;

          session.user.firstName = 'Alex';

          session.save();
          return fn(null, true);
        },
        afterware: ['middleware/auth.user.logUser']
      }
    };

##### Middleware/Afterware

All API's support both middleware and afterware. To add middleware, add the key 'middleware' to your api, and supply it an array of strings that reference other API functions, as seen in the example above.

Afterware can be added to any api by providing the key 'afterware' and supplying it an array of strings that reference other API functions. Afterware will run after an api is finished, but dose not have access to the 'fn' function.


Middleware/Afterware example:

    //Location:
    //api/middleware/auth.js

    module.exports = {
      testCredentials: function(data, fn, session, extras, next) {
        if (data.credentials == 'true') {
          return next();
        } else {
          return fn('You sent this bad fake credentials. That will not work.', null);
        }
      },
      user: {
        logUser: function(data, session, extras, next) {
          //Do something with user data like log user info into DB 
        }
      }
    };

##### next()

Next allows you to run the next functon in the iteration. If you want to skip all middleware/afterware run: 
    next({
      finish: true
    })


### Mongoose Schema

##### Location: config/schema/

Allows you to create a mongoose schema that can be used throughout your app. Configure your file to look like this:

Example: 

    //Location:
    //config/model/user.js

    var mongoose = require('mongoose');
    var Connection = require('bold').Connection;
    var Schema = mongoose.Schema;

    module.exports = Connection.model('User', new Schema({
      firstName: String,
      lastName: String,
      fullName: String
    }));

**Note:** You must use bold.Connection in order to access the same mongoose instance across your bold server.

To access your model in other parts of your app, require 'bold' and read on the Model location

    //Location:
    //api/user

    var Bold = require('bold');
    var Models = Bold.Models;

    module.exports = {
      getUser: {
        api: function(data, fn, session, extras) {
          Models.User.findById(data._id, function(err, user) {
            fn(null, user);
          });
        }
      }
    };

**Note:** Mongoose is optional. If you want to use mongoose, you must provide a mongoUri under config/config.js.

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat-square
[license-url]: https://github.com/chapinkapa/bold/blob/master/LICENSE

[npm-version-image]: http://img.shields.io/npm/v/bold.svg?style=flat-square
[npm-downloads-image]: http://img.shields.io/npm/dm/bold.svg?style=flat-square
[npm-url]: https://npmjs.org/package/bold

[travis-image]: http://img.shields.io/travis/chapinkapa/bold.svg?style=flat-square
[travis-url]: http://travis-ci.org/chapinkapa/bold