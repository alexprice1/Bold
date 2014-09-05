var url = require('url');
var apiDirectory = undefined;

exports.sockets = function SocketController(app, io, sessionStore, mongoose, apiLocation) {
  var extra = {
    mongoose: mongoose,
    io: io
  };
  apiDirectory = apiLocation;

  io.sockets.on('connection', function(socket) {
    apiSocket(socket, sessionStore, extra);
  });

  app.all(/^\/api/, function(req, res) {
    httpCall(req, res, extra);
  });
}

function apiSocket(socket, sessionStore, extra) {
  extra.socket = socket;
  extra.connectionType = 'sockets';

  socket.on('disconnect', function() {
    if (io.clients) {
      io.clients.removeUserId(socket.id);
    }
  });

  socket.on('api', function(fileName, method, data, fn) {
    extra.fileName=fileName;
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
        if(serverConfig.addSocketsToRoom){
          serverConfig.addSocketsToRoom(session,socket);
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
            var api = projRequire(apiDirectory + apiVersion + '/' + array[i].location + '.js');
            apiCall(api, array[i].method, array[i].data, session, extra, function(err, data) {
              var dataToSend = data;
              if (err) {
                dataToSend = {
                  err: err
                };
              }
              sendToClient(dataToSend, i);
            });
          } catch (err) {
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
          var api = projRequire(apiDirectory + fileName + '.js');
          apiCall(api, method, data, session, extra, function(err, data) {
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
          });
        } catch (err) {
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

function httpCall(req, res, extra) {
  var method = req.method;
  extra.req = req;
  extra.res = res;
  extra.connectionType = 'http';
  extra.method = method;

  var requestData = (method == 'GET' || method == 'DELETE') ? req.query : req.body;
  try {
    var urlDic = url.parse(req.url).pathname.replace(/^\//, '');
    urlDic = urlDic.split('/');
    var db = '';
    for (var i = 1; i < urlDic.length - 1; i++) {
      db += '/' + urlDic[i];
    }
    var api = projRequire(apiDirectory + db + '.js');
    var apiMethod = urlDic[urlDic.length - 1];
    apiCall(api, apiMethod, requestData, req.session, extra, function(err, doc) {
      if (err) {
        res.send({
          'err': err
        });
      } else {
        res.send(doc);
      }
    });
  } catch (err) {
    console.log('Error with API call::');
    console.log(err.stack)
    res.status(404).send('Not a proper api call');
  }
}

function apiCall(api, apiMethod, requestData, session, extra, fn) {
  api = api(requestData, fn, session, extra);
  api[apiMethod](requestData, fn, session, extra);
}
