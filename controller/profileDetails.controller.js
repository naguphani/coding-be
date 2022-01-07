const User = require('../models/user.model');
const STATUS_CODE = require('../statusCode')
const RESPONSE_MESSAGE = require('../responseMessage') 

module.exports = {
    saveChanges: (req, res) => {
        const {fname , lname, age, dob, city, state } = req.body;
        const date = new Date(dob);
        if (req.user.email) {
            User.findOneAndUpdate({ email: req.user.email },
                { 'name.fname': fname,
                  'name.lname': lname,
                   age: Number(age),
                   dob: date,
                   'contact.city': city,
                   'contact.state': state
                 }).exec((err, user)=>{
                     if(err){
                        res.status(STATUS_CODE.ServerError).send(err);
                     }
                     else{
                        req.user = user;
                        res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.profileChanged, type: 'success' });
                     }
                 });
            
        } else if (req.user.phone) {
            User.findOneAndUpdate({ phonr: req.user.phone },
                { 'name.fname': fname,
                  'name.lname': lname,
                   age: Number(age),
                   dob: date,
                   'contact.city': city,
                   'contact.state': state
                 }).exec((err, user)=>{
                     if(err) {
                        res.status(STATUS_CODE.ServerError).send(err);
                     }
                     else{
                        req.user = user;
                        res.status(STATUS_CODE.Created).send({ message: RESPONSE_MESSAGE.profileChanged, type: 'success' });
                     }
                 });
        }else{
            res.status(STATUS_CODE.ServerError).send({ message: RESPONSE_MESSAGE.internalError});
        }
    }
}