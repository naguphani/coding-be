const mongoose = require('mongoose');
const Codeword = require('./codeword.model');

const responseSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    resNum: Number,
    desc: String,
    translatedDesc: String,
    lang: {type: String, Default: 'English'},
    length: Number,
    questionId:mongoose.Types.ObjectId,
    codewords:[{type: mongoose.Schema.Types.ObjectId, ref: 'Codeword'}] //may be multiple codeword of any response
});


const Response = mongoose.models.Response || mongoose.model('Response', responseSchema);
module.exports = Response;
