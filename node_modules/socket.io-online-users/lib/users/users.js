module.exports = Users;

var User = require('./user');

function Users() {
  this.users = [];
};

Users.prototype.forEach = function(fn) {
  for (var i = this.users.length; i--;){
    fn.call(this,this.users[i], i, this.users);
  }
};

Users.prototype.removeSocket = function(socketId){
  var i = 0;
  var inactiveTimer = false;
  this.forEach(function(user){
    user.removeSocket(socketId);
    if(user.sockets.length === 0){
      this.findUserandRemove(user);
      inactiveTimer = true;
    }
  });
  return inactiveTimer;
};

Users.prototype.findUserandRemove = function(userToRemove){
  for(var i =0; i<this.users.length; i++){
    var user = this.users[i];
    if(this.isSameUser(user,userToRemove)){
      userToRemove.inactive = new Date();
      //return this.users.splice(i,1);
    }
  }
};

Users.prototype.populate = function(projectId) {
  //get this from redis??
  //this is to get data.
  //add users using this.extendUsers
};

Users.prototype.toJsonString = function(){
  return JSON.stringify(this.users);
};

Users.prototype.extendUsers = function(users,startOver) {
  if (!Array.isArray(users)) {
    users = [users];
  }
  var foundUsers = [];
  for (var i in users) {
    var userToExtend = users[i];
    var found = false;
    this.forEach(function(user, k) {
      if (this.isSameUser(user, userToExtend)) {
        user.extend(userToExtend);
        found = true;
        foundUsers.push(user);
      }
    });

    if (!found) {
      var user = this.newUser(userToExtend);
      foundUsers.push(user);
    }
  }

  if (startOver) {
    // go backwards to not mess up array index.
    this.forEach(function(user){
      var isFound = false;
      for (var k in foundUsers) {
        var sameUser = this.isSameUser(user, foundUsers[k]);
        if (sameUser) {
          isFound = true;
        }
      }
      if (!isFound) {
        this.users.splice(i,1);
      }
    });
  }
};

Users.prototype.removeInactive = function(inactiveTime) {
  this.forEach(function(user,i){
    if(!user.inactive){
      return;
    }
    if(new Date() - user.inactive > inactiveTime){
      this.users.splice(i,1);
    }
  });
};


Users.prototype.newUser = function(user) {
  var newUser = new User(user);
  this.users.unshift(newUser);
  return newUser;
};

Users.prototype.isSameUser = function(user1, user2) {
  //add for roles
  if (user1 === user2) {
    return true;
  } else if (user1._id === user2._id && user1.role === user2.role) {
    return true;
  } else {
    return false;
  }
};
