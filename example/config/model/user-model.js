var Connection = require('bold').Connection;
var userSchema = require('../schema/user-store');

module.exports = Connection.model('User', userSchema);