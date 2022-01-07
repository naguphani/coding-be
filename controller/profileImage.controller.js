const multer = require('multer');
const User = require('../models/user.model');
const path = require('path');
const STATUS_CODE = require('../statusCode')
const RESPONSE_MESSAGE = require('../responseMessage')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads-profile/');
    },
    filename: (req, file, cb) => {
        if(!req.user.profileLink || req.user.profileLink ==="default.png"){
            cb(null, "IMG_" + Date.now() + path.extname(file.originalname));
        }else{
            cb(null, req.user.profileLink);
        }  
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype == 'image/jpeg' || file.mimetype == 'image/png' || file.mimetype == 'image/jpg') {
        cb(null, true)
    } else {
        return cb(new Error(RESPONSE_MESSAGE.profileImageFormat,false));
    }
}
const upload = multer({ storage: storage, fileFilter: fileFilter }).single('image');

module.exports = {
    imageUpload: (req, res) => {
        upload(req, res, async (err) => {
            if (err) {
                console.log(err);
                res.status(STATUS_CODE.BadRequest).send({ message: RESPONSE_MESSAGE.profileImageFormat, type: 'danger'});
            } else {
                try {
                    if(req.user.email){
                        await User.findOneAndUpdate({ email: req.user.email }, { profileLink: req.file.filename });
                        res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.profileImageUpload, type: 'success'});
                    }else if(req.user.phone){
                        await User.findOneAndUpdate({ phone: Number(req.user.phone) }, { profileLink: req.file.filename });
                        res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.profileImageUpload, type: 'success'});
                    }else{
                        res.status(STATUS_CODE.ServerError).send({ message: RESPONSE_MESSAGE.internalError, type: 'danger'});
                    }
                } catch (error) {
                   res.status(STATUS_CODE.ServerError).send({error: RESPONSE_MESSAGE.internalError, type: 'danger'});
                }
            }
        });
    },

    imageRemove:async (req, res) => {
        try {
            if(req.user.email){
                await User.findOneAndUpdate({ email: req.user.email }, { profileLink: "default.png" });
                res.status(STATUS_CODE.Delete).send({ message: RESPONSE_MESSAGE.profileImageDelete, type: 'success'});
            }else if(req.user.phone){
                await User.findOneAndUpdate({ phone: Number(req.user.phone) }, { profileLink: "default.png" });
                res.status(STATUS_CODE.Delete).send({ message: RESPONSE_MESSAGE.profileImageDelete, type: 'success'});
            }else{
                res.status(STATUS_CODE.ServerError).send({error: RESPONSE_MESSAGE.internalError, type: 'danger'});
            }
        } catch (error) {
            res.status(STATUS_CODE.ServerError).send({error: RESPONSE_MESSAGE.internalError, type: 'danger'});
        }
    }
}