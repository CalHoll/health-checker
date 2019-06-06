// const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

/**
 * TODO: Finish notification using Twilio
 * 
 * Send a text message using Twilio by POST to /api/twilio
 */
// module.exports.sendSMS = (req, res, next) => {
//     req.assert('number', 'Phone number is required.').notEmpty();
//     req.assert('message', 'Message cannot be blank.').notEmpty();

//     const errors = req.validationErrors();

//     if (errors) {
//         req.flash('errors', errors);
//         return res.redirect('/api/twilio');
//     }

//     // TODO: get user phone number from user collection

//     const message = {
//         to: user.phoneNumber,
//         from: '+13472235148',
//         body: req.body.message
//     };
//     twilio.messages.create(message).then((sentMessage) => {
//         req.flash('success', {
//             msg: `Text send to ${sentMessage.to}`
//         });
//         res.redirect('/api/twilio');
//     }).catch(next);
// };