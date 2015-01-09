exports.testLog = function(err, res, data, session, extras) {
  if (err) {
    return console.log('The API experienced an error. Log the error to the DB.')
  } else {
    return console.log('We can log the number ' + res + 'to the DB.');
  }
};
