Novation-Mobile
=========

Novation-Mobile is a "framework" for Node.js. It was build by [Novation Mobile] to create scaleable Node.js servers with an emphasis on quick, standard development.


Version
----

0.1.0

How to use
----
In your web.js file, use the following code:
```
var nm = require('novation-mobile');
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
```
Each option should be customized for your app. 

##### Options:


Components
----
Routes
----
##### Location: routes.js
Allows you to create custom routes for your app.
```
exports.content = function(app, io) {
  //you can use this page for additional, custom routes;
  app.get("/",function(req,res,next){
    res.send("This is an example server");
  });
};

```
Standard APIs
----
##### Location: api/
Allows you to create APIs quickly and APIs that can be access by both socket.io and by RESTful APIs.

For example, if you have a file in api/test.js, and the contents are:
```
module.exports=function(data,fn,session,extras){
  exports.run=function(){
    var number = Math.random();
    if(number<.5){
      return fn("This is a standard error message.");
    } else {
      return fn(null,{
        data:"This the standard way to send data back to the client."
      });
    }
  };
  return exports;
};
```
Then you can either hit this route using http://localhost:4050/api/test/run or by using sockets on the client and running: 
```
socket.emit("api","test","run",{data:"customData"},function(err,data){
  if(err){
    console.log(err);
  } else {
    console.log(data);
  }
});
```
Mongoose Schema
----
##### Location: schema.js
Allows you to create a mongoose schema that can be used throughout your app. Configure your file to look like this:
```
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.User = mongoose.model('User', new Schema({
  createdAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  },
  firstName:String,
  lastName:String,
  fullName:String
}));
```
Environmental Variables
----
##### Location: _env.js
Allows you to create a mongoose schema that can be used throughout your app. Configure your file to look like this:
```
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.User = mongoose.model('User', new Schema({
  createdAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  },
  firstName:String,
  lastName:String,
  fullName:String
}));
```

License
----

MIT

[Novation Mobile]:http://novationmobile.com/#portfolio.html
