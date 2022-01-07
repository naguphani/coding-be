const jwt = require('jsonwebtoken');
const validator = require('validator');
const User = require('../models/user.model');
const STATUS_CODE = require('../statusCode');

module.exports = {
    authenticateUser: function (req, res, next) {
        // get auth header value
        const authHeader = req.headers['authorization'];
        //check sbHeader is undefined
        if(typeof authHeader !== 'undefined'){
            //split at space
            const auth = authHeader.split(' ');
            const token = auth[1];
            jwt.verify(token, process.env.JWT_ACCESS_KEY, function(err, decoded) {
                // err
                if(err){
                    res.status(STATUS_CODE.Unauthorized).json({err});
                }
                else{
                    if (validator.isEmail(decoded.username)){
                        User.findOne({ email: decoded.username}, (err, user)=>{
                              if(err){
                                  return res.status(STATUS_CODE.ServerError).send(err);
                              }else {
                                  req.user = user;
                                  return next();
                              }
                        });
                    }else{
                        User.findOne({ phone: decoded.username}, (err, user)=>{
                            if(err){
                                return res.status(STATUS_CODE.ServerError).send(err);
                            }else {
                                req.user = user;
                                return next();
                            }
                      });
                    }  
                }
              });
        }else{
            return res.sendStatus(STATUS_CODE.Forbidden);
        }
    }
}