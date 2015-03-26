
/**
 * Child process computation to send out emails
 */

var _ = require('lodash')
  , nodemailer = require('nodemailer') // to send emails
  , smtpTransport = require('nodemailer-smtp-transport');


/**
 * Add listener to child process
 */
process.on('message', function(data) {
  emailGun(data);
});

/**
 * EmailGun which would fire off emails from a for loop
 */
var emailGun = function emailGun (data) {

  /**
   * Create the transporter from nodemailer to send out emails
   * You can use your sendgrid/mailgun info and configurations here
   */
  var transporter = nodemailer.createTransport(smtpTransport(data.config.emailGun.transporter));

  var len = data.emails.length - 1
    , processNo = data.processNo;

  for (var i = len; i >= 0; i--) {

    var email = data.emails[i];

    // use nodemailers transporter to send out emails
    transporter.sendMail({
      from: email.toEmailAddress,
      to: email.fromEmailAddress,
      subject: email.subject,
      text: email.body
    }, function (err) {

      // log the info to get a better sense of the status on the terminal
      console.log('sending email from process no ', processNo);
      if (err) {
        // send out information to the parent process with failed email
        process.send({ failedEmail: email, upTheCount: true });
      } else {
        // a simple buzz would increase the counter of no of emaisl processed on parent
        process.send({ upTheCount: true });
      }
      console.log('*******************************************');

    });
  }

}