const mongoose = require('mongoose');
const Permission = require('./permission.model');

const userRoleSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    name: String,
    desc: String, 
    listOfPermissions:[{type: mongoose.Schema.Types.ObjectId, ref: 'Permission'}]
});


const UserRole = mongoose.models.UserRole || mongoose.model('UserRole', userRoleSchema);
module.exports = UserRole;
