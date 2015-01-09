exports.fakeCredentials = function(data, fn, session, extras, next) {
  if (data.credentials == true) {
    console.log('You have fake credentials and the API2 Middleware worked. Congrats.');
    return next();
  } else {
    return fn('You sent this bad fake credentials. That will not work.', null);
  }
};
