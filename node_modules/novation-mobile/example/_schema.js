var mongoose = require('mongoose');
var Schema = mongoose.Schema;

exports.User = mongoose.model('User', new Schema({
  createdAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  },
  firstName:String,
  lastName:String,
  fullName:String
}));
