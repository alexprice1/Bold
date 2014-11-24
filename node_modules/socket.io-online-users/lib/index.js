module.exports=onlineUsers;

var update = require('./update.js');
var broadcast = require('./broadcast.js');

function onlineUsers(opts,fn){
  if(typeof opts != 'object'){
    throw new Error('You must include options to use this module.');
  }
  if(!opts.type || ['broadcast','update'].indexOf(opts.type)===-1){
    throw new Error('Online users should be initialized with either the update type, or the broadcast type.');
  }
  if(opts.type == 'broadcast'){
    return new broadcast(opts,fn);
  } else if(opts.type == 'update'){
    return new update(opts);
  }
}

onlineUsers.update = update;

onlineUsers.broadcast = broadcast;