module.exports = {
  sessionKey: 'my_express.sid',
  sessionSecret: 'itsASecret',
  cookieKey: function(environment) {
    if(environment === 'production') {
      return 'cookieMonster';
    } else {
      return 'theFakeCookieMonster'
    }
  },
  mongoUri: 'mongodb://localhost/novation_test_db',
  redisUri: 'redis://127.0.0.1:6379'
};