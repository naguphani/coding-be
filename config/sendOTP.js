const accountSid = 'AC87a8264731fa205971a19443cccdcf95' || process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const  Twilio = require('twilio');

const client = new Twilio(accountSid, authToken, {});

module.exports = {
    //sent otp
    sendOTP:function(number,OTP){
        client.messages
        .create({
        body: `This message from ServUdyam user Authenatication.
                Please do not share this OTP at any prize.\n
                OTP: ${OTP}`,
        from: '+12056563807',
        to: `${number}`
        })
        .then(message => logger.info(message.sid))
        .catch(err => logger.error(err));
    }
};