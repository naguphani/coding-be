const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    permission: String, 
    perLevel: { type: String, default: 'Basic'}
    
});

const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
module.exports = Permission;
