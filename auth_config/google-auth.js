const User = require('../models/user.model');
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy; 
const { domainName } = require('../constant');

module.exports =(passport)=>{
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${domainName}/auth/google/home`,
        passReqToCallback: true
    },
        function (request, accessToken, refreshToken, profile, done) {
            const username = profile.emails[0].value;
            User.findOne({ email: username},async function (err, user) {
                if (err) {
                    return done(err, null);
                } else {
                    if (!user) {
                        const newUser = new User({
                            _id: new mongoose.Types.ObjectId(),
                            googleId: profile.id,
                            'name.fname': profile.name.givenName,
                            'name.lname': profile.name.familyName,
                            email: profile.emails[0].value,
                            verified:true
                        });
                        newUser.save(async (err, user) => {
                            // console.log({user: user});
                            if (!err) {
                                return done(null, user);
                                
                            }
                        });
                    }else{
                        return done(null, user);
                    }
                }
            });
        }
    ));
    
    passport.serializeUser(function (user, done) {
        return done(null, user.id);
    });
    
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            return done(err, user);
        });
    });
}