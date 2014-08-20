exports.content = function(app, io) {
  //you can use this page for additional, custom routes;
  app.get("/",function(req,res,next){
    res.send("This is an example server");
  });
};
