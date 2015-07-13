var mongoose = require('mongoose');
var Connection = require('bold').Connection;
var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: String,
  password: String
});

module.exports = Connection.model('User', userSchema);