const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { authenticateUser } = require('../auth_config/auth');
const { login } = require('../controller/login.controller');
const { forgetPass, resetPassWithEmail, resetPassWithPhone} = require('../controller/password.controller');
const { confirmAccount, verifyToken} = require('../controller/verification.controller');
const { registeration, registerWithoutPass } = require('../controller/signup.controller');
const { imageUpload, imageRemove } = require('../controller/profileImage.controller');
const { saveChanges } = require('../controller/profileDetails.controller');
require('../auth_config/google-auth')(passport);


//user register 
router.post('/register', registeration)

//user login 
router.post('/login', login);

//register without password
router.post('/registerWithoutPass', registerWithoutPass);

//forget password
router.post('/forgetPass', forgetPass);

//verify email account router
router.get('/confirm/:token', confirmAccount);

// verify token
router.get('/verify/:token', verifyToken);

//reset password through email router
router.post('/resetPassWithEmail', resetPassWithEmail); //for security also need header to check valid req.

//reset password through phone router
router.post('/resetPassWithPhone', resetPassWithPhone); //for security also need otp to check valid req.

//google auth router
router.get('/auth/google',
    passport.authenticate('google', { scope:['email', 'profile']}
));

// google redirects
router.get('/auth/google/home',
    passport.authenticate('google', { failureRedirect: '/login'}),
    async (req, res)=>{
      const username = req.user.email;
      const accessToken = await jwt.sign({username}, process.env.JWT_ACCESS_KEY, { expiresIn:'900s'});
      res.status('200').send({auth:true, accessToken:accessToken});
    }
);


//upload profile image
router.post('/imageUpload', authenticateUser, imageUpload);

//remove profile image
router.get('/imageRemove', authenticateUser, imageRemove);

//update user profile details
router.post('/saveChanges', authenticateUser, saveChanges);

//user logout 
router.get('/logout', (req, res) => {
  res.status('200').send({auth:false, accessToken:null});
});



module.exports = router;
