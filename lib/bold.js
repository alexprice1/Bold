var clc = require('cli-color');
var path = require('path');
var appDir = path.dirname(require.main.filename);

/* Dependencies */
var os = require('os');
var fs = require('fs');
var url = require('url');
var signature = require('cookie-signature');
var express = require('express');
var mongoose = require('mongoose');
var cookie = require('cookie');
var connect = require('connect');
var session = require('express-session');
var errorHandler = require('errorhandler');
var connectRedis = require('connect-redis');
var http = require('http');
var https = require('https');
http.globalAgent.maxSockets = Infinity;
 
var clcError = clc.red;

var Bold = {
  start: function(fn) {
    var app = express();
    var server = http.createServer(app);
    var config = require(appDir + '/config/config.js'); 

    this.setupConfig(config, app.get('env'));

    var RedisStore = connectRedis(session);

    if (typeof config.ssl == 'object') {
      config.ssl.key = config.ssl.key != undefined ? config.ssl.key : 'ssl/key.pem';
      config.ssl.cert = config.ssl.cert != undefined ? config.ssl.cert : 'ssl/cert.pem';
      var credentials = {
        key: fs.readFileSync(appDir + '/' + config.ssl.key),
        cert: fs.readFileSync(appDir + '/' + config.ssl.cert)
      };
      config.serverSSL = https.createServer(credentials, app);
    }

    if (!config.redisUri) {
      throw 'Must define "REDIS_URI" in your config file.';
    } else if (!config.sessionKey) {
      throw 'Must define "SESSION_KEY" in your config file.';
    } else if (!config.sessionSecret) {
      throw 'Must define "SESSION_SECRET" in your config file.';
    } else if (!config.cookieKey) {
      throw 'Must define "COOKIE_KEY" in your config file.';
    }

    var redisUrl = url.parse(config.redisUri);
    app.set('redisHost', redisUrl.hostname);
    app.set('redisPort', redisUrl.port);

    if (redisUrl.auth) {
      var redisAuth = redisUrl.auth.split(':');
      app.set('redisDb', redisAuth[0]);
      app.set('redisPass', redisAuth[1]);
    }

    if (redisUrl.path) {
      app.set('redisDbIndex', redisUrl.path.slice(1, redisUrl.path.length));
    } else {
      app.set('redisDbIndex', 0);
    }

    var cookieParser = require('cookie-parser')(config.cookieKey);
    app.use(cookieParser);
    app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
      next();
    });

    var redisStoreConfig = {
      host: app.set('redisHost'),
      port: app.set('redisPort'),
      pass: app.set('redisPass'),
      db: app.set('redisDbIndex')
    };
    if (!config.dontUseRedisTTL) {
      redisStoreConfig.ttl = config.ttl || 3600;
    }

    var sessionStore = new RedisStore(redisStoreConfig);

    /* Redis Setup */
    app.use(session({
      key: config.sessionKey,
      secret: config.sessionSecret,
      store: sessionStore,
      cookie: {
        // iOS fullscreen app mode drops sessions unless we do this
        // http://stackoverflow.com/questions/7077518/ios-full-screen-web-app-drops-cookies
        maxAge: 3600000
      }
    }));

    if (config.sessionExpireDate != undefined) {
      app.use(function(req, res, next) {
        req.session.cookie.expires = config.sessionExpireDate;
        next();
      })
    }
    if (app.get('env') === 'development') {
      app.use(errorHandler({
        dumpExceptions: true,
        showStack: true
      }));
    } else {
      process.addListener('uncaughtException', function(err) {
        console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
        console.error(err.stack);
        process.exit();
      });
    }
    // for file uploads
    var bodyParser = require('body-parser');

    app.use(bodyParser.urlencoded({
      extended: true,
      limit: '2048mb'
    }));

    app.use(bodyParser.json({
      limit: '2048mb'
    }));

    // favicon
    if (config.favicon) {
      favicon = appDir + '/' + config.favicon;
      app.use(require('serve-favicon')(favicon), function() {
        console.log(err, favicon_url)
      });
    }

    app.use(require('method-override')());
    app.use(errorHandler());
    if (app.get('env') == 'production') {
      //This is ssl, add when ready
      app.all('*', function(req, res, next) {
        if (req.url.indexOf('healthcheck') !== -1) {
          res.send('server is running');
          return;
        }
        if (config.sslRedirect) {
          if (req.headers.host == undefined) {
            res.send('');
          } else if (req.headers.host.match(/^www/) !== null) {
            res.redirect('https://' + req.headers.host.replace(/^www\./, '') + req.url);
          } else if (req.protocol.indexOf('https') === -1) {
            res.redirect('https://' + req.headers.host + req.url);
          } else {
            next();
          }
        } else {
          next();
        }
      });
    }

    // assuming io is the Socket.IO server object!
    var io = require('socket.io')(server);
    io.use(function(socket, next) {
      var handshakeData = socket.request;
      if (handshakeData.headers.cookie) {
        handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
        try {
          var real_sid = handshakeData.cookie[process.env.SESSION_KEY].replace('s:', '');
          real_sid = signature.unsign(real_sid, process.env.SESSION_SECRET);

          handshakeData.sessionID = real_sid;
        } catch (err) {
          console.log(clcError(err));
          return next('Looks like we\'ve got a hacker on our hands.', false);
        }

        if (handshakeData.cookie[process.env.SESSION_KEY] == handshakeData.sessionID) {
          console.log(clcError('Cookie is invalid'));
          return next('Cookie is invalid.', false);
        }

      } else {
        return next('No cookie transmitted.', false);
      }
      next(null, true);
    });

    var ioRedis = require('socket.io-redis');
    var redisIO = require('redis');
    var pubIO = redisIO.createClient(app.set('redisPort'), app.set('redisHost'), {
      return_buffers: true
    });
    var subIO = redisIO.createClient(app.set('redisPort'), app.set('redisHost'), {
      return_buffers: true
    });

    pubIO.auth(app.set('redisPass'), function(err) {
      if (err) {
        throw err;
      }
    });
    subIO.auth(app.set('redisPass'), function(err) {
      if (err) {
        throw err;
      }
    });

    // for redis online users
    io.adapter(ioRedis({
      key: 'io:' + config.appName,
      pubClient: pubIO,
      subClient: subIO
    }));

    if (config.onlineUsersConfig) {
      config.onlineUsersConfig.type = 'update';
      var client = redisIO.createClient(app.set('redisPort'), app.set('redisHost'), {});
      client.select(app.set('redisDbIndex') || 0, function(err) {
        if (err) {
          throw err;
        }
      });
      client.auth(app.set('redisPass'), function(err) {
        if (err) {
          throw err;
        }
      });
      config.onlineUsersConfig.io = io;
      config.onlineUsersConfig.dataClient = client;
      config.onlineUsersConfig.appName = config.appName;
      config.onlineUsersConfig.serverName = config.server + ':' + os.hostname();
      var OnlineUsers = require('socket.io-online-users');
      io.clients = new OnlineUsers.update(config.onlineUsersConfig);
    }

    if(config.mongoUri) {
      Bold.Connection = mongoose.createConnection(config.mongoUri, function(err) {
        if (err) {
          return console.log(clcError('Connecting to mongoose error::', err));
        }
      });
      Bold.Models = requireFiles(appDir + '/config/model');
    }

    require('./controller.js')(app, io, sessionStore);

    require(appDir + '/config/routes.js')(app);

    if (config.useStaticServer != undefined) {
      if (config.viewEngine) {
        app.set('view engine', config.viewEngine);
      } else {
        app.set('view engine', 'jade');
      }
      if (config.viewDirectory) {
        app.set('views', appDir + '/' + config.viewDirectory);
      } else {
        app.set('views', appDir + '/views');
      }
      app.locals.basedir = app.get('views');
      if (config.publicDirectory) {
        app.use(express.static(appDir + '/' + config.publicDirectory));
      } else {
        app.use(express.static(appDir + '/public'));
      }
    }

    var port = process.env.PORT || config.port || 4050;
    server.listen(port);
    if (fn) {
      return fn(port);
    }

    if (typeof config.ssl == 'object') {
      var sslPort;
      if (process.env.PORT) {
        sslPort = 443;
      } else if (config.ssl.port) {
        sslPort = config.ssl.port
      } else {
        sslPort = 5051;
      }
      config.serverSSL.listen(sslPort);
    }
  },
  setupConfig: function(config, env) {
    for(var key in config) {
      if(typeof config[key] === 'function') {
        config[key] = config[key](env);
      }
    }
  }
};

function requireFiles(directory) {
  var files = fs.readdirSync(directory);
  var fileHash = {};
  files.forEach(function(file) {
    if(file.indexOf('.js') === file.length - 3 && fs.statSync(directory + '/' + file).isFile()) {
      fileHash[capitalizeFirstLetter(file.replace('.js', ''))] = require(directory + '/' + file);
    }
  });
  return fileHash;
}

function capitalizeFirstLetter(string) {
  string = string.charAt(0).toUpperCase() + string.slice(1);
  return string.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

module.exports = Bold;
