This goes in your web.js file

var logger = require("redis-logger");

//where server1 can be found by looking up os.hostname(); //Redis Logger var servers = ['ubuntu', 'Colin-Asus', 'Brandons-MacBook-Pro.local', 'vault1', 'vault2', 'betavault1'];

logger.init(servers, 'vault'); logger.logPage(app, "username", "password", "/logs", "logs", express);

require('./routes.js').sockets(io, cookieParser, sessionStore, mongoose, app, logger);

//In the routes.js file exports.sockets = function(io, cookieParser, sessionStore, mongoose, app, logger) { io.sockets.on('connection', function(socket) { logger.socket(socket); require('./api/utils/_controller.js').socket(socket, sessionStore); }); };