var clc = require('cli-color');

var clcError = clc.red;
var clcWarn = clc.yellow;

// configure extras and globals
exports.extra = function(projectDir) {
  GLOBAL.projRequire = function(module) {
    if (module == undefined) {
      return;
    }
    if (module.indexOf('/') != 0) {
      module = '/' + module;
    }
    return require(projectDir + module);
  }
  GLOBAL.rootUrl = projectDir;
  return exports;
};

// configure server
exports.server = function() {
  var envLocation, apiLocation, mongooseSchemaLocation, config;
  var fn = arguments[1];
  if (typeof arguments[0] == 'object') {
    config = arguments[0];
    envLocation = config.envLocation;
    apiLocation = config.apiLocation;
    mongooseSchemaLocation = config.mongooseSchemaLocation;
  } else {
    throw 'You do not have the right parameters.';
  }
  if (!config) {
    throw 'Must include a config file.';
  }

  config.server = config.server ? config.server : 'Main';
  config.servers = config.servers ? config.servers : [config.server];

  /* Dependencies */
  var express = require('express');
  var mongoose = require('mongoose');
  var cookie = require('cookie');
  var connect = require('connect');
  var session = require('express-session');
  var errorHandler = require('errorhandler');

  /* Vars */
  var app = express();
  var http = require('http');
  var server = http.createServer(app);
  var RedisStore = require('connect-redis')(session);
  var os = require('os');
  var fs = require('fs');
  var https = require('https');
  var url = require('url');
  var signature = require('cookie-signature');

  if (typeof config.ssl == 'object') {
    config.ssl.key = config.ssl.key != undefined ? config.ssl.key : 'ssl/key.pem';
    config.ssl.cert = config.ssl.cert != undefined ? config.ssl.cert : 'ssl/cert.pem';
    var credentials = {
      key: fs.readFileSync(rootUrl + '/' + config.ssl.key),
      cert: fs.readFileSync(rootUrl + '/' + config.ssl.cert)
    };
    config.serverSSL = https.createServer(credentials, app);
  }

  projRequire(envLocation).configureEnvironment(app, process);
  if (!process.env.REDIS_URI) {
    throw 'Must define "REDIS_URI" in the environment variables.';
  } else if (!process.env.SESSION_KEY) {
    throw 'Must define "SESSION_KEY" in the environment variables.';
  } else if (!process.env.SESSION_SECRET) {
    throw 'Must define "SESSION_SECRET" in the environment variables.';
  } else if (!process.env.COOKIE_KEY) {
    throw 'Must define "COOKIE_KEY" in the environment variables.';
  } else if (!process.env.MONGO_URI) {
    throw 'Must define "MONGO_URI" in the environment variables.';
  }

  var logger;
  if (!config.turnOffAwesomeLogs) {
    var servers = config.servers;
    if (config.servers) {
      servers = config.servers;
    }
    logger = require('redis-logger').init(servers, os.hostname());
  }

  var redisUrl = url.parse(process.env.REDIS_URI);
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

  var cookieParser = require('cookie-parser')(process.env.COOKIE_KEY);
  app.use(cookieParser);
  app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    if (req.headers.origin) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next();
  });

  var redisStoreConfig = {
    url: process.env.REDIS_URI
  };
  if (!config.dontUseRedisTTL) {
    redisStoreConfig.ttl = config.ttl || 3600;
  }
  var sessionStore = new RedisStore(redisStoreConfig);

  /* Redis Setup */
  app.use(session({
    key: process.env.SESSION_KEY,
    secret: process.env.SESSION_SECRET,
    store: sessionStore
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
  var favicon = rootUrl + '/public/img/favicon.ico'
  if (config.favicon != undefined) {
    favicon = rootUrl + '/' + config.favicon;
  }

  app.use(require('serve-favicon')(favicon), function() {
    console.log(err, favicon_url)
  });

  app.use(require('method-override')());
  app.use(errorHandler());
  app.all('*', function(req, res, next) {
    if (req.url.indexOf('healthcheck') !== -1) {
      res.send('server is running');
      return;
    } else {
      next();
    }
  });

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
    io.clients = new OnlineUsers(config.onlineUsersConfig);
  }

  if (!config.turnOffAwesomeLogs && logger) {
    logger.logPage(app, config.loggerUsername, config.loggerPassword, '/redis-logger.html').socket(io);
  }
  mongoose.connect(process.env.MONGO_URI, function(err) {
    if (err) {
      return console.log(clcError('Connecting to mongoose error::', err));
    }
  });

  mongoose.schema = projRequire(mongooseSchemaLocation);
  require('./helpers.js').makeGlobal(config, mongoose, io).useAPIOutsideOfHTTP();
  if (config.preContent) {
    projRequire(config.preContent).content(app, io, mongoose);
  }

  require('./controller.js').sockets(app, io, sessionStore, mongoose, apiLocation);

  if (config.postContent) {
    projRequire(config.postContent).content(app, io, mongoose);
  }
  if (config.useStaticServer != undefined) {
    if (config.viewEngine) {
      app.set('view engine', config.viewEngine);
    } else {
      app.set('view engine', 'jade');
    }
    if (config.viewDirectory) {
      app.set('views', rootUrl + '/' + config.viewDirectory);
    } else {
      app.set('views', rootUrl + '/views');
    }
    app.locals.basedir=app.get('views');
    if (config.publicDirectory) {
      app.use(express.static(rootUrl + '/' + config.publicDirectory));
    } else {
      app.use(express.static(rootUrl + '/public'));
    }
  }

  var port = process.env.PORT || config.port || 4050;
  server.listen(port);
  console.log('NM server started on port ' + port);
  if (fn) {
    return fn();
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
    console.log('NM server started on ssl port ' + sslPort);
    if (fn) {
      return fn();
    }
  }
};
