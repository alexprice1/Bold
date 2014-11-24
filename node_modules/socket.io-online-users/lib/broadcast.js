module.exports=broadcast;

var redis = require('redis');
var Users = require('./users/users.js');

function RedisClient(redisConfig){
  var client = redis.createClient(redisConfig.port, redisConfig.host, {});
  client.select(redisConfig.dbIndex || 0, function(err) {
    if (err) {
      throw err;
    }
  });
  client.auth(redisConfig.pass, function(err) {
    if (err) {
      throw err;
    }
  });
  return client;
}

function broadcast(opts,fn){
  var This = this;
  if(!opts || !opts.redisConfig){
    throw new Error('You must include redisconfig');
  }
  this.fn = fn || function(){};
  this.usersModel = new Users();
  this.users = this.usersModel.users;
  this.redisClient = new RedisClient(opts.redisConfig);

  this.multi = this.getMulti(opts.appName,opts.servers);

  setInterval(function(){
    This.getUsers();
  },900);

  //check out keyspace notifications later.
  //var sub = new RedisClient(opts.redisConfig);
}

broadcast.prototype.getMulti = function(appName,servers){
  var multi=this.redisClient.multi();
  var keys=[];
  for(var i in servers){
    var key=getKey(appName,servers[i]);
    keys.push(key);
    //multi.hgetall(key);
    multi.get(key);
  }
  return multi;
};

broadcast.prototype.getUsers = function(){
  var This = this;
  this.multi.exec(function(err,servers){
    if(err){
      return console.log('err',err);
    }
    var newUsers = [];
    for(var i=0; i<servers.length;i++){
      var users = servers[i]
      if(!users){
        continue;
      }
      users = JSON.parse(users);
      for(var k=0;k<users.length;k++){
        if(users[k]){
          newUsers.push(users[k]);
        }
      }
    }
    This.usersModel.extendUsers(newUsers,true);
    //have to 'erase', and then readd
    This.fn(This.users);
  });
};

function getKey(appName,server){
  return appName+":"+server;
}
