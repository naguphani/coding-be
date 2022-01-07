const Codebook = require('../models/codebook.model');
const Codeword = require('../models/codeword.model');
const STATUS_CODE = require('../statusCode')
module.exports = {
    addCodeword: (req, res) => {
        const {projectCodebookId, questionCodebookId, codeword, codeKey} = req.body;
        const newCodeword = new Codeword({
            _id: new mongoose.Types.ObjectId(),
            tag: codeword, 
            key: codeKey
        }).save((err, codeword)=>{
            if(err) res.status(STATUS_CODE.ServerError).send(err);
            else{
                Codebook.findByIdAndUpdate(questionCodebookId, { $push: { codebooks: codeword._id } }, { upsert: true, new: true })
                .exec((err, Qcodebook) => {
                    if(err) res.status(STATUS_CODE.ServerError).send(err);
                    else{
                        Codebook.findByIdAndUpdate(projectCodebookId, { $push: { codebooks: codeword._id } }, { upsert: true, new: true })
                        .exec((err, Pcodebook) => {
                            if(err) res.status(STATUS_CODE.ServerError).send(err);
                            else{
                                res.status(STATUS_CODE.OK).send(codeword);
                            } 
                        })  
                    } 
                })
            }
        })
    },

    editCodeword: (req,res) => {
        const {editCodeword, codewordId} = req.body;
        Codeword.findByIdAndUpdate(codewordId, {$set:{tag: editCodeword}}, {new: true}, (err, codeword) => {
            if (err) {
                if(err) res.status(STATUS_CODE.ServerError).send(err);
            }else{
                res.status(STATUS_CODE.OK).send(codeword);
            }
        });
    },
    
    deleteCodeword: (req, res) => {
        const codewordId = req.body.codewordId;
        Codeword.findByIdAndRemove(codewordId, (err, result) => {
            if (err) {
                if(err) res.status(STATUS_CODE.ServerError).send(err);
            }else{
                res.status(STATUS_CODE.OK).send("Delete Codeword : ",result);
            } 
        });
    }
}
