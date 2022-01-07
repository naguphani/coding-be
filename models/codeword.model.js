const mongoose = require('mongoose');
// const MpathPlugin = require('mongoose-mpath');

const codewordSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    tag: String,
    active: { type:Boolean, default: true },
    resToAssigned:[{type: Number}]
});
// add plugin
// codewordSchema.plugin(MpathPlugin);

const Codeword = mongoose.models.Codeword || mongoose.model('Codeword', codewordSchema);
module.exports = Codeword ;
