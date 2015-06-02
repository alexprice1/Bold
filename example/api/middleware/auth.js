module.exports = {
  testCredentials: function(data, fn, session, extras, next) {
    if (data.credentials == true) {
      console.log('You have fake credentials and the Middleware worked. Congrats.');
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