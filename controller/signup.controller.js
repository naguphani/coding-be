const { sendOTP } = require('../config/sendOTP');
const { sendEmail } = require('../config/sendEmail');
const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const {
    verificationEmailTokenExpiresIn,
    domainName,
    registerEmail_from,
    registerEmail_subject,
    registerEmail_text } = require('../constant');

const STATUS_CODE = require('../statusCode')
const RESPONSE_MESSAGE = require('../responseMessage')

module.exports = {
    //sign up
    registeration: (req, res) => {
        const { username, password } = req.body;
        // console.log({ username, password });
        if (validator.isEmail(username)) {
            //Regiteration with email address
            //find user already exists or not
            User.findOne({ email: username }, async (err, user) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send(err);
                } else {
                    //new user
                    if (!user) {
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
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: username,
                            password: password
                        });
                        newUser.save((err, user) => {
                            // console.log({user:user});
                            if (err) {
                                res.status(STATUS_CODE.ServerError).send(err);
                            } else {
                                // console.log(Token);
                                sendEmail(data);
                                res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.userRegistered});
                            }
                        });

                    } else {
                        //user is already exists
                        res.status(STATUS_CODE.DuplicateData).send({ message: RESPONSE_MESSAGE.userExist })
                    }
                }
            })
        } else {
            // Registration with phone number
            //find user already exists or not
            User.findOne({ phone: username }, (err, user) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send(err);
                } else {
                    //new user
                    if (!user) {

                        const phoneOTP = Math.floor(Math.random() * 1000000 + 1);
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            phone: Number(username),
                            password: password,
                            otp: phoneOTP
                        });
                        newUser.save((err, user) => {
                            if (err) {
                                res.status(STATUS_CODE.ServerError).send(err);
                            } else {
                                // sendOTP(username, phoneOTP);
                                res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.userRegistered });
                            }
                        });

                    } else {
                        //user already exists
                        res.status(STATUS_CODE.DuplicateData).send({ message: RESPONSE_MESSAGE.userExist  });
                    }
                }
            })
        }
    },

    // registeration without password
    registerWithoutPass: (req, res) => {
        const { username } = req.body;
        if (validator.isEmail(username)) {
            User.findOne({ email: username }, (err, user) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send(err);
                } else {
                    //new user
                    if (!user) {
                        newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            email: username
                            //other info according to form
                        });
                        newUser.save((err, user) => {
                            if (err) {
                                res.status(STATUS_CODE.ServerError).send(err);
                            } else {
                                res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.userRegistered });
                            }
                        });
                    } else {
                        //user is already exists
                        res.status(STATUS_CODE.DuplicateData).send({ message: RESPONSE_MESSAGE.userExist })
                    }
                }
            })
        } else {
            User.findOne({ phone: username }, (err, user) => {
                if (err) {
                    res.status(STATUS_CODE.ServerError).send(err);
                } else {
                    //new user
                    if (!user) {
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            phone: username
                            //other info according to form
                        });
                        newUser.save((err, user) => {
                            if (err) {
                                res.status(STATUS_CODE.ServerError).send(err);
                            } else {
                                res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.userRegistered });
                            }
                        });
                    } else {
                        //user already exists
                        res.status(STATUS_CODE.DuplicateData).send({ message: RESPONSE_MESSAGE.userExist });
                    }
                }
            })
        }
    }



}