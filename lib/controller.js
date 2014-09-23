var url = require('url');
var clc = require('cli-color');

var clcError = clc.red;
var clcWarn = clc.yellow;
var apiDirectory = undefined;

exports.sockets = function SocketController(app, io, sessionStore, mongoose, apiLocation) {
  apiDirectory = apiLocation;

  io.sockets.on('connection', function(socket) {
    apiSocket(socket, sessionStore);
  });

  app.all(/^\/api/, function(req, res) {
    httpCall(req, res);
  });
}

function apiSocket(socket, sessionStore) {

  socket.on('disconnect', function() {
    if (io.clients) {
      io.clients.removeUserId(socket.id);
    }
  });

  socket.on('api', function(fileName, method, data, fn) {
    var extras = {
      mongoose: mongoose,
      io: io,
      socket: socket,
      connectionType: 'socket'
    };
    extras = getIPAddress(extras);
    extras.fileName = fileName;
    // this is for iOS
    if (fileName && fileName.path) {
      fileName = fileName.path;
    }
    if (method && method.method) {
      method = method.method;
    }
    var sessionID = socket.request.sessionID;
    if (!sessionID) {
      return;
    }
    var fn = arguments[arguments.length - 1];
    if (typeof fn != 'function') {
      fn = function() {};
    }
    sessionStore.load(sessionID, function(storeErr, session) {
      if (!session || storeErr) {
        return fn('error getting a session');
      }
      if (session && session.user && session.user._id) {
        if (serverConfig.addSocketsToRoom) {
          serverConfig.addSocketsToRoom(session, socket);
        }
        var userRoom = 'userId:' + session.user._id;
        if (session.user && session.user._id && socket.rooms.indexOf(userRoom) == -1) {
          socket.join(userRoom);
          socket.join('onlineUsers');
          if (io.clients) {
            io.clients.setUserId(session.user._id, socket.id);
          }
        }
      }
      socket.join(sessionID);

      // update redis online users
      session.sessionID = sessionID;
      session.save();

      if (typeof fileName == 'object') {
        // allows for several asynchronous calls. Super sweet! Sends data to client as received
        var apiVersion = '';
        if (!serverConfig.preventApiVersioning) {
          var apiVersion = typeof method == 'string' ? method : 'v1/';
        }
        var array = fileName;
        var count = 0;
        var last = array.length;
        var sendArray = [];
        for (var i in array) {
          getApi(array, i);
        }

        function getApi(array, i) {
          try {
            var file = array[i].location;
            var method = array[i].method;
            var data = array[i].data;
            API[file][method](data, function(err, data) {
              var dataToSend = data;
              if (err) {
                dataToSend = {
                  err: err
                };
              }
              sendToClient(dataToSend, i);
            }, session, extras);
          } catch (err) {
            if (err && err.stack && err.stack.indexOf && err.stack.indexOf('Error: Cannot find module') != -1) {
              console.log(clcWarn('cannot find API::', array[i].location, array[i].method, array[i].data));
              console.log(clcError(err));
              return sendToClient({
                err: "Cannot find API '" + array[i].method + "' in '" + array[i].location + ".js.'"
              }, i);
            }
            console.log('Error with API call::');
            console.log(err.stack);
            sendToClient({
              err: fileName
            }, i);
          }
        }

        function sendToClient(data, i) {
          count++;
          sendArray[i] = data;
          if (count === last) {
            fn(sendArray, null);
          }
        }
      } else {
        try {
          API[fileName][method](data, function(err, data) {
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
        } catch (err) {
          if (err && err.stack && err.stack.indexOf && err.stack.indexOf('Error: Cannot find module' != -1)) {
            console.log(clcWarn('cannot find API::', fileName, method, data));
            console.log(clcError(err));
            return fn(null, {
              err: "Cannot find API '" + method + "' in '" + fileName + ".js.'"
            });
          }
          console.log('Error with API call::');
          console.log(err.stack)
          fn(null, {
            err: [fileName, method, data]
          });
        }
      }
    });
  });
}

function httpCall(req, res, extras) {
  var method = req.method;
  var extras = {
    mongoose: mongoose,
    io: io,
    req: req,
    res: res,
    connectionType: 'http',
    method: method
  };
  extras = getIPAddress(extras);
  var fileName;
  var requestData = data = (method == 'GET' || method == 'DELETE') ? req.query : req.body;
  try {
    var urlDic = url.parse(req.url).pathname.replace(/^\//, '');
    urlDic = urlDic.split('/');
    var fileName = '';
    for (var i = 1; i < urlDic.length - 1; i++) {
      fileName += '/' + urlDic[i];
    }
    fileName = fileName.slice(1, fileName.length);
    var api = projRequire(apiDirectory + fileName + '.js');
    var apiMethod = urlDic[urlDic.length - 1];
    API[fileName][apiMethod](requestData, function(err, doc) {
      if (err) {
        res.send({
          'err': err
        });
      } else {
        res.send(doc);
      }
    }, req.session, extras);
  } catch (err) {
    if (err && err.stack && err.stack.indexOf && err.stack.indexOf('Error: Cannot find module' != -1)) {
      console.log(clcWarn('cannot find API::', fileName, method, data));
      console.log(clcError(err));
      return res.status(404).send("Cannot find API '" + method + "' in '" + fileName + ".js.'");
    }
    console.log('Error with API call::');
    console.log(err.stack)
    res.status(404).send('Not a proper api call');
  }
}

function getIPAddress(extras) {
  /*******************FIND IP START**************************/
  //Set the IP to unknown initially.
  //Perhaps if you aren't behind a load balancer the client could "spoof" their IP :/
  //Maybe we need to have a configuration option of using load balancer?

  //Also Note that sometimes you can get more than one ip address in req.headers['x-forwarded-for'].
  //The general format of the field is:
  //x-forwarded-for: client, proxy1, proxy2, proxy3
  //This would give us a comma separated array. I have yet to see this happen though with HaProxy
  var ipAddress = 'unknown';
  if (extras.socket) {
    //-Get IP Address from Socket IO
    ipAddress = extras.socket.request.connection.remoteAddress;
    //-If behind a load balancer get the IP from x-forwarded-for
    if (extras.socket.handshake.headers['x-forwarded-for']) {
      ipAddress = extras.socket.handshake.headers['x-forwarded-for'];
    }
  } else if (extras.req) {
    //-Get IP Address from HTTP/HTTPS request
    ipAddress = extras.req.connection.remoteAddress;
    //-If behind a load balancer get the IP from x-forwarded-for
    if (extras.req.headers['x-forwarded-for']) {
      ipAddress = extras.req.headers['x-forwarded-for'];
    }
  }
  extras.ipAddress = ipAddress;
  return extras;
  /*******************FIND IP FINIS**************************/
}
