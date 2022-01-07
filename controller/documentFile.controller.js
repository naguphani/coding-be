const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const STATUS_CODE = require('../statusCode')
const RESPONSE_MESSAGE = require('../responseMessage')

const s3 = new AWS.S3({
   accessKeyId: process.env.AWS_ACCESS_ID,
   secretAccessKey: process.env.AWS_ACCESS_SECRET
});

const storage = multer.memoryStorage({
    destination: function (req, file, cb) {
        cb(null, '');
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||  //.xlsx
        file.mimetype == 'application/vnd.ms-excel' || file.mimetype == 'text/csv') {            //.xls || csv
        cb(null, true)
    } else {
        return cb(new Error(RESPONSE_MESSAGE.docFileFormat),false);
    }
}

const upload = multer({ storage: storage, fileFilter: fileFilter }).single('file');

module.exports ={
    uploadFile:(req,res)=>{
        upload(req, res, async (err) => {
            if (err) {
                res.status(STATUS_CODE.BadRequest).send({ error: RESPONSE_MESSAGE.docFileFormat, type: 'danger'});
            } else {
                // console.log(req.file);
                const params ={
                    Bucket: process.env.AWS_DOCUMENT_BUCKET,
                    Key: "DOC_" + Date.now() + path.extname(req.file.originalname),
                    Body: req.file.buffer
                }
                s3.upload(params,(err,data) => {
                    if(err){
                        res.status(STATUS_CODE.ServerError).send({ message:RESPONSE_MESSAGE.internalError, type: 'danger'});
                    }else{
                        res.status(STATUS_CODE.Created).send({ message:RESPONSE_MESSAGE.docFileSave, type: 'success', key: data.Key });    
                    }
                });
            }
        });
    },

    getFile:(req, res)=>{
        const key = req.body.key;
        const params ={
            Bucket: process.env.AWS_DOCUMENT_BUCKET,
            Key: key
        }
        s3.getObject(params).
        createReadStream().
        on('error', function(err){
              res.status(STATUS_CODE.ServerError).send({error:err});
        }).
        pipe(res);
    },
    
    deleteFile:(req, res)=>{
        const key = req.body.key;
        const params ={
            Bucket: process.env.AWS_DOCUMENT_BUCKET,
            Key: key
        }
        s3.deleteObject(params,(err,data) => {
            if(err){
                res.status(STATUS_CODE.ServerError).send({ message:RESPONSE_MESSAGE.internalError, type: 'danger'});
            }else{
                res.status(STATUS_CODE.Delete).send({ message:RESPONSE_MESSAGE.docFileDelete, type: 'success'});    
            }
        });
    }
}