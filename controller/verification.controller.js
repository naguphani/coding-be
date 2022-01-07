const jwt = require('jsonwebtoken');
const { frontendUrl } = require('../constant');
const User = require('../models/user.model');
const STATUS_CODE = require('../statusCode');

module.exports ={
    confirmAccount: (req, res)=>{
        const {token} = req.params;
        jwt.verify(token, process.env.JWT_ACCESS_KEY, (err, user) => {
            if (err) {
                // console.log(err);
                res.status(STATUS_CODE.Unauthorized).json({err});
            }
            else {
                // console.log(user);
                User.findOneAndUpdate({email: user.username},{verified:true},{new: true}).
                exec((err, user) => {
                    if(err) {
                        res.status(STATUS_CODE.ServerError).send({err:err});
                    }else {
                        res.status(STATUS_CODE.Ok).redirect(`${frontendUrl}/login`);
                    }
                })
            }
        });
    },
    verifyToken: (req, res)=>{
        const {token} = req.params;
        jwt.verify(token, process.env.JWT_ACCESS_KEY, (err, user) => {
            if (err) {
                // console.log(err);
                res.status(STATUS_CODE.Unauthorized).json({err});
            }
            else {
                res.status(STATUS_CODE.Ok).send({username: user.username});
            }
        });
    }
}