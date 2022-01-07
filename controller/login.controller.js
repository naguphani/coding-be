const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { sendEmail } = require('../config/sendEmail');
const { loginTokenExpiresIn,
        verificationEmailTokenExpiresIn,
        domainName,
        registerEmail_from,
        registerEmail_subject,
        registerEmail_text} = require('../constant');
const STATUS_CODE = require('../statusCode')
const RESPONSE_MESSAGE = require('../responseMessage')

module.exports = {
    login: (req, res) => {
        const { username, password } = req.body;
        if (validator.isEmail(username)) {
            //login with email
            User.findOne({ email: username },async (err, user) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send(err);
                } else {
                    if (!user) {
                        res.status(STATUS_CODE.NotFound).send({ message: RESPONSE_MESSAGE.userNotFound });
                    } else {
                        if (!user.password) {
                            res.status(STATUS_CODE.Ok).send({ message: RESPONSE_MESSAGE.passwordNotFound });
                        }
                        else if (user.comparePassword(password)) {
                            if (user.verified){
                                //login
                                //expires time 15 minutes
                                const accessToken = jwt.sign({ username }, process.env.JWT_ACCESS_KEY, { expiresIn: loginTokenExpiresIn });
                                res.status(STATUS_CODE.Ok).send({ auth: true, accessToken: accessToken, user:user });
                            } else {
                                    // 10 minutes
                                    const Token = await jwt.sign({ username, password }, process.env.JWT_ACCESS_KEY, { expiresIn: verificationEmailTokenExpiresIn });
                                    console.log(Token);
                                    const data = {
                                        from: `${registerEmail_from}`,
                                        to: username,
                                        subject: `${registerEmail_subject}`,
                                        text: `${registerEmail_text}`,
                                        html: `<h1 style="color: #d03737" >Hello Survey Buddy</h1>
                                                    <p>Thanks for Registering.</p>
                                                    <a class="btn btn-primary" href="${domainName}/confirm/${Token}">Verify your account</a>`
                                    }
                                    sendEmail(data);
                                    res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.unverifiedUser });  
                            }

                        } else {
                            res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.passwordNotMatch });
                            
                        }
                    }
                }
            })
        } else {
            //login with phone number
            User.findOne({ phone: Number(username) },async (err, user) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send(err);
                } else {
                    if (!user) {
                        res.status(STATUS_CODE.NotFound).send({ message: RESPONSE_MESSAGE.userNotFound });
                    } else {
                        if (!user.password) {
                            res.status(STATUS_CODE.Ok).send({ message: RESPONSE_MESSAGE.passwordNotFound });
                        }
                        else if (user.verified) {
                            if (User.comparePassword(password)) {
                                //login
                                //expires time 15 minutes
                                const accessToken = jwt.sign({ username }, process.env.JWT_ACCESS_KEY, { expiresIn: loginTokenExpiresIn  });
                                res.status(STATUS_CODE.Ok).send({ auth: true, accessToken: accessToken, user:user  });
                            } else {
                                res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.passwordNotMatch});
                            }
                        } else {
                            res.status(STATUS_CODE.Unauthorized).send({ message: RESPONSE_MESSAGE.unverifiedUser });
                        }
                    }
                }
            })
        }
    }
}