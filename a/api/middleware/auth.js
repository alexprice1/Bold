module.exports = {
  testCredentials: function(data, fn, session, extras, next) {
    if (data.credentials == 'true') {
      return next();
    } else {
      return fn('You sent this bad fake credentials. That will not work.', null);
    }
  },
  user: {
    logUser: function(data, session, extras, next) {
      //Do something with user data like log user info into DB 
    }
  }
};