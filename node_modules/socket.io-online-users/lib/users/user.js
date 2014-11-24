module.exports = User;

function User(user) {
  this.sockets = [];
  this.extend(user);
}
var k = 0;
User.prototype.extend = function(user) {
  //handle rooms and handle sockets
  user = this.addSocket(user);
  for (var i in user) {
    this[i] = user[i];
  }
  if(!this.start){
    this.start = new Date();
  }
  if(!this.sockets.length && !user.inactive){
    delete this.inactive;
  }
};

User.prototype.removeSocket = function(socketId){
  var index = this.sockets.indexOf(socketId);
  if(index === -1){
    return;
  }
  this.sockets.splice(index,1);
};

User.prototype.addSocket = function(user){
  var socketId = user.socketId;
  if(!socketId){
    return user;
  }
  if(this.sockets.indexOf(socketId) === -1){
    this.sockets.unshift(socketId);
  }
  delete user.socketId;
  return user;
};