//email setup
const Mailgun = require('mailgun-js');//demo
const mg = new Mailgun({apiKey: process.env.SG_MAIL_API_KEY, domain: process.env.SG_MAIL_DOMAIN});

module.exports = {
    //send email
    sendEmail:function(data){
        mg.messages().send(data,async  function (err, body) {
            if(err){
                return err;  
            }else{
                return body;
            }
        });
    }
};