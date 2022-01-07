const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const UserRole = require('./userRole.model');
const Project = require('./project.model');
const userSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    googleId: String, 
    facebookId: String,
    email: { type: String, sparse: true },
    phone: { type: Number, sparse: true },
    password: String,
    name: {
        fname: { type: String, trim: true },
        lname: { type: String, trim: true }
    },
    profileLink: { type: String, trim: true , default: 'default.png'},
    age:{ type: Number, max: 100 },
    dob: Date,
    gender: String,
    verified: { type: Boolean, default: false},
    contact:{
        city: String,
        state: String,
    },
    surveyInfo:{
        numSurvey: Number,
        totalNumOfSurveyCom: Number //score => totalNumOfSurvey*10
    },
    lang:[{ type: String }],
    otp: Number,
    userRoles:{type: mongoose.Schema.Types.ObjectId, ref: 'UserRole'},
    projects:[{type: mongoose.Schema.Types.ObjectId, ref: 'Project'}]
});

userSchema.pre('save',  function(next) {
    const user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);
            user.password = hash;
            return next();
        });
    });
});

userSchema.pre('findOneAndUpdate',  function(next) {
    const update = this.getUpdate();
    if (update.password) {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) return next(err);
            bcrypt.hash(update.password, salt, (err, hash) => {
                if (err) return next(err);
                this.getUpdate().password = hash;
                next();
          })
        })
      } else {
        next();
      }
});

userSchema.methods.comparePassword = function(password) {
    return bcrypt.compareSync(password,this.password);
};


const User = mongoose.models.User || mongoose.model('User', userSchema);
module.exports = User;
