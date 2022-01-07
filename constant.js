const domainName = 'http://localhost:5000';
const frontendUrl = 'http://localhost:3000'

//QuestionType Enum
const qType_Question = "Q"
const qType_Filter = "F"


// expired time of token 
const loginTokenExpiresIn = '1800s'; // 15 minutes
const verificationEmailTokenExpiresIn = '600s'; // 10 minutes
const resetPasswordTokenExpiresIn = '300s'; // 5 minutes

// register email data
const registerEmail_from = 'Verify Email from Survey Buddy <info@surveybuddy.com>';
const registerEmail_subject = 'Verify your registered email.';
const registerEmail_text = 'Verify !!!';

// forget/reset password email data
const forgetPassEmail_from = 'Reset password from Survey Buddy <info@surveybuddy.com>';
const forgetPassEmail_subject = 'Reset your password';
const forgetPassEmail_text = 'Reset password';
const cacheTimeFullProject = '3600'; //1 hour

module.exports ={
   loginTokenExpiresIn,
   verificationEmailTokenExpiresIn,
   resetPasswordTokenExpiresIn,
   domainName,
   registerEmail_from,
   registerEmail_subject,
   registerEmail_text,
   forgetPassEmail_from,
   forgetPassEmail_subject,
   forgetPassEmail_text,
   frontendUrl,
   cacheTimeFullProject,
   qType_Question,
   qType_Filter
}