const { sendOTP } = require('../config/sendOTP');
const { sendEmail } = require('../config/sendEmail');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/user.model');
const { 
    resetPasswordTokenExpiresIn, 
    frontendUrl,
    forgetPassEmail_from,
    forgetPassEmail_subject,
    forgetPassEmail_text } = require('../constant');

const STATUS_CODE = require('../statusCode')
const RESPONSE_MESSAGE = require('../responseMessage')   

module.exports = {
    forgetPass: (req, res) => {
        const { username } = req.body;
        if (validator.isEmail(username)) {
            //resetpass using email verification
            User.findOne({ email: username},async (err, user)=>{
                if(err||!user){
                    res.status(STATUS_CODE.NotFound).send({ message: RESPONSE_MESSAGE.userNotFound });
                }else{
                    //expires in 5 minutes
                    const Token = await jwt.sign({username}, process.env.JWT_ACCESS_KEY, { expiresIn: resetPasswordTokenExpiresIn});
                    const data = {
                        from: `${forgetPassEmail_from}`,
                        to: username,
                        subject: `${forgetPassEmail_subject}`,
                        text: `${forgetPassEmail_text}`,
                        html: `<h1 style="color: #d03737" >Hello Survey Buddy</h1>
                                <a class="btn btn-primary" href="${frontendUrl}/resetPassword/${Token}">Click here to reset your password</a>`
                    }
                    try {
                        sendEmail(data);
                        res.status(STATUS_CODE.Ok).send({ message: RESPONSE_MESSAGE.resetPasswordEmail});
                    } catch (error) {
                        res.status(STATUS_CODE.ServerError).send(error);
                    }
                }
            })
        } 
        else {
            //resetpass using phone otp verification
            User.findOne({ phone: username}, (err, user)=>{
                if(err||!user){
                    res.status(STATUS_CODE.NotFound).send({ message: RESPONSE_MESSAGE.userNotFound});
                }else{
                    const phoneOTP = Math.floor(Math.random() * 1000000 + 1);
                    User.findOneAndUpdate({phone:username},{otp: phoneOTP}, {new: true}).
                    exec((err, user) => {
                        if (err) {
                            res.status(STATUS_CODE.ServerError).send(err);
                        } else {
                            // sendOTP(username, phoneOTP);
                            res.status(STATUS_CODE.Ok).send({ message: RESPONSE_MESSAGE.OTPsent});
                        }
                    });
                }
            });
        }
    },

    resetPassWithEmail: (req, res)=>{
        const { username, newPassword} = req.body;
         // get reset password header value
         const resetHeader = req.headers['resetpassword'];
         //check sbHeader is undefined
         if(typeof resetHeader !== 'undefined'){
             //split at space
             const reset = resetHeader.split(' ');
             const token = reset[1];
             jwt.verify(token, process.env.JWT_ACCESS_KEY, function(err, decoded) {
                 // err
                 if(err){
                    res.json({err});
                 }
                 else{
                     if(decoded.username === username ){
                        if (validator.isEmail(username)){
                            User.findOneAndUpdate({ email:username},{password: newPassword}, {new:true}, (err, user)=>{
                                  if(err){
                                      res.status(STATUS_CODE.ServerError).send({err:err});
                                  }else {
                                      req.user = user;
                                      res.status(STATUS_CODE.Created).send({message: RESPONSE_MESSAGE.passwordChanged});
                                  }
                            });
                        }else{
                            res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.invalidUser}); 
                        } 
                     }else{
                         res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.invalidUser});
                     }
                 }
               });
         }else{
             return res.sendStatus(STATUS_CODE.Forbidden);
         }

    },

    resetPassWithPhone: (req, res)=>{
        const {username, newPassword, otp} = req.body;
        User.findOne({phone: username},(err, user)=>{
            if(err){
                res.status(STATUS_CODE.ServerError).send(err);
            }else{
                if(!user){
                    res.status(STATUS_CODE.NotFound).send({ message: RESPONSE_MESSAGE.userNotFound}); 
                }else{
                    if(user.otp === Number(otp) && user.otp !== null){
                        User.findOneAndUpdate({ phone:username},{password: newPassword, otp:null}, {new:true}, (err, user)=>{
                            if(err){
                                res.status(STATUS_CODE.ServerError).send(err);
                            }else {
                                res.status(STATUS_CODE.Created).send({message: RESPONSE_MESSAGE.passwordChanged});
                            }
                      });  
                    }else{
                        res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.invalidUser}); 
                    }
                }
            }
        })
    }
}