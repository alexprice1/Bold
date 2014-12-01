var url = require("url");
var redis = require("redis");
var serversGroup = [];
var applicationName = 'default'
var fs=require("fs");
var os = require("os");
var loggerTransactions = null;
var db;

exports.init = function(_serversGroup, _applicationName) {
  if (_serversGroup) {
    serversGroup = _serversGroup;
  }

  applicationName = _applicationName;
  var redisUrl = url.parse(process.env.REDIS_URI),
    redisAuth = redisUrl.auth.split(':');
  db = redis.createClient(redisUrl.port, redisUrl.hostname);
  var dbAuth = function() {
    db.auth(redisAuth[1]);
  };
  db.setMaxListeners(0);
  db.addListener('connected', dbAuth);
  db.addListener('reconnected', dbAuth);
  dbAuth();
  var db1 = redis.createClient(redisUrl.port, redisUrl.hostname);
  db1.setMaxListeners(0);
  var db1Auth = function() {
    db1.auth(redisAuth[1]);
  };
  db1.addListener('connected', dbAuth);
  db1.addListener('reconnected', dbAuth);
  db1Auth();
  db.subscribe("logs");

  var defaultLog = console.log;
  var Logger = function() {
    this.log = function() {
      var message = '';
      try {
        for (var i in arguments) {
          message += ' ' + JSON.stringify(arguments[i]);
        }
        db1.publish('logs', JSON.stringify({
          message: message,
          hostName: os.hostname(),
          time: new Date()
        }));
        defaultLog.apply(undefined, arguments);
      } catch (e) {}

    };
  };
  global.defaultLog = defaultLog;
  global.logger = new Logger();
  console.log = logger.log;
  return exports;
};

exports.socket=function(io){
  db.on("message", function(channel, message) {
    if (channel == 'logs') {
      if (serversGroup.indexOf(os.hostname()) >= 0) {
        io.emit('log', message, applicationName, serversGroup);
        if (loggerTransactions) {
          loggerTransactions.log({
            'message': message.toString()
          });

        }
      }
    }
  });
  return exports;
}

exports.loggerTran = function(client) {
  loggerTransactions = client;
  return exports;
};

exports.logPage=function(app,username,password,url){
  var basicAuth = require('basic-auth-connect');
  var auth = basicAuth(function(user, pass, callback) {
    var result = (user === username && pass === password);
    callback(null/* error */, result);
  });
  app.get(url, auth, function(req, res) {
    var file=__dirname+"/public/logs.html";
    res.sendfile(file);
  });
  return exports;
}



