var url = require('url');
var clc = require('cli-color');

var clcError = clc.red;
var clcWarn = clc.yellow;

var os = require('os');

var API = require('./api');

module.exports = function SocketController(app, io, sessionStore) {
  io.sockets.on('connection', function(socket) {
    apiSocket(socket, sessionStore);
  });

  app.all(/^\/api/, function(req, res) {
    httpCall(req, res);
  });
};

function apiSocket(socket, sessionStore) {

  socket.on('disconnect', function() {
    if (io.clients) {
      io.clients.removeSocket(socket.id);
    }
  });

  socket.on('api', function(fileName, method, data, fn) {
    var extras = {
      socket: socket,
      connectionType: 'socket',
      fileName: fileName
    };
    //middleware?
    var sessionID = socket.request.sessionID;

    if (!sessionID) {
      return;
    }
    var fn = arguments[arguments.length - 1];
    if (typeof fn != 'function') {
      fn = function() {};
    }
    sessionStore.load(sessionID, function(storeErr, session) {
      if (storeErr) {
        return fn('error getting a session');
      }
      getIPAddress(extras);
      socket.join(sessionID);

      session.sessionID = sessionID;

      callAPI(fileName, method, data, function(err, data) {
        // we send it this way because iOS can't recieve multiple arguments
        if (err) {
          if (!data) {
            data = {}
          }
          data.err = err;
        }
        if (typeof data == 'object') {
          data = JSON.parse(JSON.stringify(data));
        }
        fn(data, err);
      }, session, extras);
    });
  });
}

function httpCall(req, res, extras) {
  req.session.sessionID = req.sessionID;
  var method = req.method;
  var extras = {
    req: req,
    res: res,
    connectionType: 'http',
    method: method,
    hostname: os.hostname()
  };
  getIPAddress(extras);

  var fileName;
  var data = (method == 'GET' || method == 'DELETE') ? req.query : req.body;
  var urlDic = url.parse(req.url).pathname.replace(/^\//, '');
  urlDic = urlDic.split('/');
  var fileName = '';
  for (var i = 1; i < urlDic.length - 1; i++) {
    fileName += '/' + urlDic[i];
  }
  fileName = fileName.slice(1, fileName.length);
  method = urlDic[urlDic.length - 1];
  callAPI(fileName, method, data, function(err, doc) {
    if (err) {
      res.send({
        'err': err
      });
    } else {
      res.send(doc);
    }
  }, req.session, extras);
}

function callAPI(fileName, method, data, fn, session, extras) {
  try {
    API.require(fileName + '.' + method)(data, fn, session, extras);
  } catch (err) {
    console.log('Error with API call::');
    console.log(err.stack)
    fn(null, {
      err: [fileName, method, data]
    });
  }
}

function getIPAddress(extras) {
  var ipAddress = 'unknown';
  if (extras.socket) {
    ipAddress = extras.socket.request.connection.remoteAddress;
    if (extras.socket.handshake.headers['x-forwarded-for']) {
      ipAddress = extras.socket.handshake.headers['x-forwarded-for'];
    }
  } else if (extras.req) {
    ipAddress = extras.req.connection.remoteAddress;
    if (extras.req.headers['x-forwarded-for']) {
      ipAddress = extras.req.headers['x-forwarded-for'];
    }
  }
  extras.ipAddress = ipAddress;
}
