const mongoose = require('mongoose');
// const MpathPlugin = require('mongoose-mpath');
const Codeword = require('./codeword.model');

const folderSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    name: String,
    codewords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Codeword' }]
});
// add plugin
// folderSchema.plugin(MpathPlugin);

const Folder = mongoose.models.Folder || mongoose.model('Folder', folderSchema);
module.exports = Folder;
