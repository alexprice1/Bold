module.exports = function(app) {
  app.use(function(req, res, next) {
    if(req.path) {
      next()
    } else {
      res.statusCode(500).send('Something terribly wrong happened.');
    }
  });
  app.get('/get-user', function(req, res) {
    console.log('get user');
  });
};