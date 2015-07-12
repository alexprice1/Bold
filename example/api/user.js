var sampleUser = {
  name: 'Alex Price'
};

module.exports = {
  getUser: {
    middleware: ['middleware/auth.testCredentials'],
    api: function(data, fn, session, extras) {
      
      return fn(null, sampleUser);
    },
    afterware: ['middleware/auth.user.logUser']
  }
};