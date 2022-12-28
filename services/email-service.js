'use strict';

const config = require('../config')
const sgMail = require('@sendgrid/mail')

async function sendEmail(subject, content) {
  const msg = {
    to: config.EMAIL_TO,
    from: config.EMAIL_FROM, // Use the email address or domain you verified above
    subject: subject,
    text: content,
    html: content
  };
  
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);
    if (error.response) {
      console.error(error.response.body)
    }
  }
}

module.exports = {
  sendEmail
}