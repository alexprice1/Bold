exports.configureEnvironment = function(app, process) {
  process.env['SESSION_KEY'] = 'my_express.sid';
  process.env['SESSION_SECRET'] = 'itsASecret';
  process.env['COOKIE_KEY'] = 'cookieMonster';
  process.env.MONGO_URI = 'mongodb://localhost/novation_test_db';
  process.env.REDIS_URI = 'redis://127.0.0.1:6379';
};
