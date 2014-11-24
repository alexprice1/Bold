module.exports = update;

var usersModel = require('./users/users.js');

function update(opts){
  if(!opts.appName || !opts.serverName || !opts.dataClient){
    throw "You must intialze this object with one object arguments with the following properties, io (your io object), appName (the name of your app), serverName (name of which server this code will be on), and dataClient, your redis.createClient() object to store your data on.";
  }
  this.inactiveTime = opts.inactiveTime || 100;
  this.io=opts.io;
  this.dataClient=opts.dataClient;
  this.appName=opts.appName;
  this.roomsToListenTo= opts.roomsToListenTo || ["onlineUsers"];
  this.timer=opts.timer || 0;
  this.serverName=opts.serverName;
  if(this.serverName.indexOf(":")!=-1){
    this.serverType=this.serverName.split(":")[0];
  }
  this.key=getKey(this.appName,this.serverName);

  this.usersModel = new usersModel();
  this.users = this.usersModel.users;

  this.adapter = this.io.sockets.adapter;
}

update.prototype.addUser = function(user,socket){
  this.usersModel.extendUsers(user,socket);
  this.updateCounter();
};

update.prototype.updateCounter = function(createInactiveAlso){
  var This = this;
  var time = this.timer ? this.timer : 1000;
  if(createInactiveAlso && new Date() - This.inactiveTime > time){
    //move forward
    time = This.inactiveTime + 10;
  } else if(This.updatingClients){
    return;
  }
  This.lastUpdate = new Date();
  This.lastUpdateTime = time;
  This.updatingClients = true;
  This.counterTimeout = setTimeout(function(){
    This.usersModel.removeInactive(This.inactiveTime);
    This.updatingClients = false;
    This.updateClients();
  },time);
};

update.prototype.updateClients = function(){
  this.dataClient.set(this.key,this.usersModel.toJsonString());
};

update.prototype.removeSocket = function(socketId){
  var update = this.usersModel.removeSocket(socketId);
  if(update){
    this.updateCounter();
  }
  this.updateCounter(true);
};

function getKey(appName,server){
  return appName+":"+server;
}
function getServerName(server){
  server=server.split(":");
  return server[0];
}
