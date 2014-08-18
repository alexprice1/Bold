exports.configureEnvironment = function(app, process) {
  process.env['SESSION_KEY'] = 'my_express.sid';
  process.env['SESSION_SECRET'] = '';
  process.env['COOKIE_SECRET'] = '';
  process.env.MONGO_URI = '';
  process.env.REDIS_URI = '';
};
