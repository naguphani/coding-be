const mongoose = require('mongoose');
const Codeword = require('./codeword.model');

const codebookSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    codewords:[{type: mongoose.Schema.Types.ObjectId, ref: 'Codeword'}] 
});


const Codebook = mongoose.models.Codebook|| mongoose.model('Codebook', codebookSchema);
module.exports = Codebook;
