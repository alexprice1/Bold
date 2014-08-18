exports.configureEnvironment = function(app, process) {
  process.env['SESSION_KEY'] = 'my_express.sid';
  process.env['SESSION_SECRET'] = 'exampleSecret';
  process.env['COOKIE_SECRET'] = 'ExampleCookie';
  process.env.MONGO_URI = '';
  process.env.REDIS_URI = 'redis://redis:redis@ip:port/dbindex';
};
