'use strict';

const config = require('./config');
const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const app = express();
const {isDefined} = require('./utils')
const {v4: uuidv4} = require('uuid');
const sgMail = require('@sendgrid/mail');
const pg = require('pg')
pg.defaults.ssl = true

const fbService = require('./services/fb-service')
const dialogflowService = require('./services/dialogflow-service')
const emailService = require('./services/email-service')
const userService = require('./services/user-service')
const colorService = require('./services/color-service')
const jobApplicationService = require('./services/job-application-service')
const weatherService = require('./services/weather-service')
const {sendTextMessage} = require('./services/fb-service')

// Messenger API parameters
if (!config.FB_PAGE_TOKEN) {
  throw new Error('missing FB_PAGE_TOKEN');
}
if (!config.FB_VERIFY_TOKEN) {
  throw new Error('missing FB_VERIFY_TOKEN');
}
if (!config.GOOGLE_PROJECT_ID) {
  throw new Error('missing GOOGLE_PROJECT_ID');
}
if (!config.DF_LANGUAGE_CODE) {
  throw new Error('missing DF_LANGUAGE_CODE');
}
if (!config.GOOGLE_CLIENT_EMAIL) {
  throw new Error('missing GOOGLE_CLIENT_EMAIL');
}
if (!config.GOOGLE_PRIVATE_KEY) {
  throw new Error('missing GOOGLE_PRIVATE_KEY');
}
if (!config.FB_APP_SECRET) {
  throw new Error('missing FB_APP_SECRET');
}
if (!config.SERVER_URL) { //used for ink to static files
  throw new Error('missing SERVER_URL');
}
if (!config.SENDGRID_API_KEY) { //used for ink to static files
  throw new Error('missing SENDGRID_API_KEY');
}
if (!config.EMAIL_TO) { //used for ink to static files
  throw new Error('missing EMAIL_TO');
}
if (!config.EMAIL_FROM) { //used for ink to static files
  throw new Error('missing EMAIL_FROM');
}
if (!config.PG_CONFIG) { //used for ink to static files
  throw new Error('missing PG_CONFIG');
}


sgMail.setApiKey(config.SENDGRID_API_KEY);
app.set('port', (process.env.PORT || 5000))

//verify request came from facebook
app.use(bodyParser.json({
  verify: verifyRequestSignature
}));

//serve static files in the public directory
app.use(express.static('public'));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: false
}));

// Process application/json
app.use(bodyParser.json());

const sessionIds = new Map();
const usersMap = new Map()

// Index route
app.get('/', function (req, res) {
  res.send('Hello world, I am a chat bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
  console.log('request');
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('Failed validation. Make sure the validation tokens match.');
    res.sendStatus(403);
  }
})

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook/', function (req, res) {
  var data = req.body;
  console.log(JSON.stringify(data));
  
  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function (pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;
      
      // Iterate over each messaging event
      pageEntry.messaging.forEach(function (messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log('Webhook received unknown messagingEvent: ', messagingEvent);
        }
      });
    });
    
    // Assume all went well.
    // You must send back a 200, within 20 seconds
    res.sendStatus(200);
  }
});

async function setSessionAndUser(senderID) {
  if (!sessionIds.has(senderID)) {
    sessionIds.set(senderID, uuidv4());
  }
  
  if (!usersMap.has(senderID)) {
    const user = await userService.findOrCreateUser(senderID)
    if (!user) {
      console.error('Unable to retrieve user.')
    } else {
      usersMap.set(senderID, user)
    }
  }
}

async function receivedMessage(event) {
  
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  await setSessionAndUser(senderID)
  //console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
  //console.log(JSON.stringify(message));
  
  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;
  
  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;
  
  if (isEcho) {
    handleEcho(messageId, appId, metadata);
    return;
  } else if (quickReply) {
    handleQuickReply(senderID, quickReply, messageId);
    return;
  }
  
  if (messageText) {
    //send message to api.ai
    const senderSessionId = sessionIds.get(senderID)
    fbService.sendTypingOn(senderID)
    const dialogflowResponse = await dialogflowService.sendTextToDialogFlow(senderID, senderSessionId, messageText);
    await handleDialogFlowResponse(senderID, dialogflowResponse)
  } else if (messageAttachments) {
    handleMessageAttachments(messageAttachments, senderID);
  }
}

function handleMessageAttachments(messageAttachments, senderID) {
  //for now just reply
  fbService.sendTextMessage(senderID, 'Attachment received. Thank you.');
}

async function handleQuickReply(senderID, quickReply, messageId) {
  var quickReplyPayload = quickReply.payload;
  console.log('Quick reply for message %s with payload %s', messageId, quickReplyPayload);
  //send payload to api.ai
  const senderSessionId = sessionIds.get(senderID)
  fbService.sendTypingOn(senderID)
  
  switch(quickReplyPayload) {
    case 'NEWS_PER_DAY':
      try {
        const subscribed = await userService.setNewsLetterPreference(senderID, 1)
        if (subscribed) {
          const subscribedResponse = `Thanks for subscribing.  Send message 'unsubscribe' to stop receiving messages.`
          fbService.sendTextMessage(senderID, subscribedResponse)
        }
      } catch (error) {
        const errorResponse = `Unable to subscribe.  Try your request later.`
        fbService.sendTextMessage(senderID, errorResponse)
      }
      break;
    case 'NEWS_PER_WEEK':
      try {
        const subscribed = await userService.setNewsLetterPreference(senderID, 2)
        if (subscribed) {
          const subscribedResponse = `Thanks for subscribing.  Send message 'unsubscribe' to stop receiving messages.`
          fbService.sendTextMessage(senderID, subscribedResponse)
        }
      } catch (error) {
        const errorResponse = `Unable to subscribe.  Try your request later.`
        fbService.sendTextMessage(senderID, errorResponse)
      }
      break;
    default:
      const dialogflowResponse = await dialogflowService.sendTextToDialogFlow(senderID, senderSessionId, quickReplyPayload);
      await handleDialogFlowResponse(senderID, dialogflowResponse)
      break;
    
  }
}

//https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
function handleEcho(messageId, appId, metadata) {
  // Just logging message echoes to console
  console.log('Received echo for message %s and app %d with metadata %s', messageId, appId, metadata);
}

async function handleDialogFlowAction(sender, action, messages, contexts, parameters) {
  console.log(action)
  switch (action) {
    case 'unsubscribe_newsletter':
      try {
        await userService.setNewsLetterPreference(sender, 0)
        sendTextMessage(sender,'You have been unsubscribed from the newsletter.')
      } catch (error) {
        sendTextMessage(sender,'We were unable to cancel your subscription.  Try again later.')
      }
      break;
    case 'buy_iphone':
      let buyIPhoneResponse = 'What color would you like?'
      {
        const userFavoriteColor = await colorService.getUserColor(sender)
        if (userFavoriteColor) {
          buyIPhoneResponse = `Would you like to order it in your favorite color ${userFavoriteColor}?`
        }
      }
      fbService.sendTextMessage(sender, buyIPhoneResponse)
      break;
    case 'iphone_colors_get_favorite':
      {
        const userFavoriteColor = parameters.fields['color'].stringValue
        await colorService.updateUserColor(userFavoriteColor, sender)
        const userFavoriteColorReply = `Oh, I like that color too.  I'll remember that.`
        fbService.sendTextMessage(sender, userFavoriteColorReply)
      }
      break;
    case 'get_iphone_colors':
      const colors = await colorService.getAllColors()
      const colorsResponseText = `The IPhone is available in ${colors.join(', ')}.  What is your favorite color?`
      fbService.sendTextMessage(sender, colorsResponseText)
      break;
    case 'get_current_weather':
      if (parameters.fields.hasOwnProperty('geo-city') && parameters.fields['geo-city'].stringValue !== '') {
        try {
          const city = parameters.fields['geo-city'].stringValue
          const weather = await weatherService.getCurrentWeather(city)
          if (weather.hasOwnProperty('weather')) {
            const reply = `${messages[0].text.text} ${weather['weather'][0]['description']}`;
            fbService.sendTextMessage(sender, reply)
          }
        } catch (error) {
          console.log(error)
          fbService.sendTextMessage(sender, 'Current weather is unavailable.')
        }
      } else {
        // No city?  Forward bot question asking for entity
        handleMessages(messages, sender)
      }
      break;
    case 'get_product_delivery_status':
      handleMessages(messages, sender)
      fbService.sendTypingOn(sender);
      setTimeout(() => {
        const buttons = [
          {
            type: 'web_url',
            url: 'https://www.myapple.com/track_order',
            title: 'Track my Order'
          },
          {
            type: 'phone_number',
            payload: '+15555555555',
            title: 'Call Us'
          },
          {
            type: 'postback',
            payload: 'CHAT',
            title: 'Keep on Chatting'
          }
        ]
        
        fbService.sendButtonMessage(sender, 'What would you like to do next?', buttons)
      }, 3000)
      break;
    case 'get_position':
    {
      const filteredContexts = contexts.filter(el => {
        return el.name.includes('job_application')
      })
      if (filteredContexts.length > 0 && contexts[0].parameters) {
        const jobVacancy = getContextParameter(contexts[0], 'job_vacancy')
        const hasApplied = await jobApplicationService.hasJobApplication(sender, jobVacancy)
        if (hasApplied) {
          const alreadyAppliedResponse = 'You have already applied for this position.'
          fbService.sendTextMessage(sender, alreadyAppliedResponse)
          break;
        }
      }
      handleMessages(messages, sender);
      break;
    }
    case 'get_application_details':
      // Find any relevant context included in the action data
      const filteredContexts = contexts.filter(el => {
        return el.name.includes('job_application') ||
          el.name.includes('job_application_details_dialog_context')
      })
      
      // Check for params
      if (filteredContexts.length > 0 && contexts[0].parameters) {
        
        // gather params
        let phoneNumber = getContextParameter(contexts[0], 'phone_number')
        let username = getContextParameter(contexts[0], 'username')
        let previousJob = getContextParameter(contexts[0], 'previous_job')
        let yearsOfExperience = getContextParameter(contexts[0], 'years_of_experience')
        let jobVacancy = getContextParameter(contexts[0], 'job_vacancy')
        
        // If we are asking about yearsOfExperience send this custom response
        if (phoneNumber === '' && username !== '' && previousJob !== '' && yearsOfExperience === '') {
          const replies = [
            {
              'content_type': 'text',
              'title': 'Less than 1 year',
              'payload': 'Less than 1 year'
            },
            {
              'content_type': 'text',
              'title': 'Less than 10 years',
              'payload': 'Less than 10 years'
            },
            {
              'content_type': 'text',
              'title': 'More than 10 years',
              'payload': 'More than 10 years'
            }
          ]
          fbService.sendQuickReply(sender, messages[0].text.text[0], replies)
        }
        // If all params are complete send email
        else if (phoneNumber !== '' && username !== '' && previousJob !== '' && yearsOfExperience !== '' && jobVacancy !== '') {
          
          const jobApplication = {
            phoneNumber,
            applicantName: username,
            previousJob,
            yearsOfExperience,
            jobVacancy
          }
          const application = await jobApplicationService.insertJobApplication(sender, jobApplication)
          const emailContent = `A new job inquiry from ${username} for the position: ${jobVacancy}.
          <br /> Previous position: ${previousJob}
          <br /> Years of experience: ${yearsOfExperience}
          <br /> Phone Number: ${phoneNumber}
          `
          await emailService.sendEmail('New job Application', emailContent)
        }
      }
      
      // Send messages from backend chatbot
      handleMessages(messages, sender);
      break;
    default:
      //unhandled action, just send back the text
      handleMessages(messages, sender);
  }
}

function getContextParameter(context, paramName) {
  return (isDefined(context.parameters.fields[paramName]) && context.parameters.fields[paramName] !== '')
    ? context.parameters.fields[paramName].stringValue : ''
}

function handleMessage(message, sender) {
  switch (message.message) {
    case 'text': //text
      message.text.text.forEach((text) => {
        if (text !== '') {
          fbService.sendTextMessage(sender, text);
        }
      });
      break;
    case 'quickReplies': //quick replies
      let replies = [];
      message.quickReplies.quickReplies.forEach((text) => {
        let reply =
          {
            'content_type': 'text',
            'title': text,
            'payload': text
          }
        replies.push(reply);
      });
      fbService.sendQuickReply(sender, message.quickReplies.title, replies);
      break;
    case 'image': //image
      fbService.sendImageMessage(sender, message.image.imageUri);
      break;
  }
}

function handleCardMessages(messages, sender) {
  
  let elements = [];
  for (var m = 0; m < messages.length; m++) {
    let message = messages[m];
    let buttons = [];
    for (var b = 0; b < message.card.buttons.length; b++) {
      let isLink = (message.card.buttons[b].postback.substring(0, 4) === 'http');
      let button;
      if (isLink) {
        button = {
          'type': 'web_url',
          'title': message.card.buttons[b].text,
          'url': message.card.buttons[b].postback
        }
      } else {
        button = {
          'type': 'postback',
          'title': message.card.buttons[b].text,
          'payload': message.card.buttons[b].postback
        }
      }
      buttons.push(button);
    }
    
    
    let element = {
      'title': message.card.title,
      'image_url': message.card.imageUri,
      'subtitle': message.card.subtitle,
      'buttons': buttons
    };
    elements.push(element);
  }
  fbService.sendGenericMessage(sender, elements);
}

function handleMessages(messages, sender) {
  let timeoutInterval = 1100;
  let previousType;
  let cardTypes = [];
  let timeout = 0;
  for (var i = 0; i < messages.length; i++) {
    
    if (previousType == 'card' && (messages[i].message != 'card' || i == messages.length - 1)) {
      timeout = (i - 1) * timeoutInterval;
      setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
      cardTypes = [];
      timeout = i * timeoutInterval;
      setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
    } else if (messages[i].message == 'card' && i == messages.length - 1) {
      cardTypes.push(messages[i]);
      timeout = (i - 1) * timeoutInterval;
      setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
      cardTypes = [];
    } else if (messages[i].message == 'card') {
      cardTypes.push(messages[i]);
    } else {
      
      timeout = i * timeoutInterval;
      setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
    }
    
    previousType = messages[i].message;
    
  }
}

async function handleDialogFlowResponse(sender, response) {
  let responseText = response.fulfillmentMessages.fulfillmentText;
  let messages = response.fulfillmentMessages;
  let action = response.action;
  let contexts = response.outputContexts;
  let parameters = response.parameters;
  
  fbService.sendTypingOff(sender);
  
  if (isDefined(action)) {
    await handleDialogFlowAction(sender, action, messages, contexts, parameters);
  } else if (isDefined(messages)) {
    handleMessages(messages, sender);
  } else if (responseText === '' && !isDefined(action)) {
    //dialogflow could not evaluate input.
    fbService.sendTextMessage(sender, 'I\'m not sure what you want. Can you be more specific?');
  } else if (isDefined(responseText)) {
    fbService.sendTextMessage(sender, responseText);
  }
}

/*
 * Postback Event
 *
 * This event is called when a postback is tapped on a Structured Message.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received
 *
 */
async function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  await setSessionAndUser(senderID)
  
  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;
  
  switch (payload) {
    case 'GET_STARTED':
      greetUserText(senderID);
      break;
    case 'FUN_NEWS':
      sendFunNewsSubscribe(senderID)
      break;
    case 'JOB_INQUIRY':
      console.log('in job inquiry')
      const senderSessionId = sessionIds.get(senderID)
      const dialogflowResponse = await dialogflowService.sendEventToDialogFlow(senderID, senderSessionId,'JOB_OPENINGS')
      await handleDialogFlowResponse(senderID, dialogflowResponse)
      break;
    
    case 'CHAT':
      fbService.sendTextMessage(senderID, 'Fantastic.  What else would you like to chat about?');
      break;
    
    default:
      //unindentified payload
      fbService.sendTextMessage(senderID, 'I\'m not sure what you want. Can you be more specific?');
      break;
    
  }
  
  console.log('Received postback for user %d and page %d with payload \'%s\' ' +
    'at %d', senderID, recipientID, payload, timeOfPostback);
  
}

function sendFunNewsSubscribe(userId) {
  let responseText = `
  I can send you the latest fun tech news as messages.  You'll be on top of things and get some laughs.
  How often would you like to receive the them.
  `
  
  const replies = [
    {
      content_type: "text",
      title: "Once per week",
      payload: "NEWS_PER_WEEK"
    },
    {
      content_type: "text",
      title: "Once per day",
      payload: "NEWS_PER_DAY"
    }
  ]
  
  fbService.sendQuickReply(userId, responseText, replies)
}

function greetUserText(userId) {
  const user = usersMap.get(userId)
  const greetingText = ` Welcome ${user.first_name}!  I can answer frequently asked questions and perform initial job interviews.  What can I help you with?`
  fbService.sendTextMessage(userId, greetingText);
}


/*
 * Message Read Event
 *
 * This event is called when a previously-sent message has been read.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read
 *
 */
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  
  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;
  
  console.log('Received message read event for watermark %d and sequence ' +
    'number %d', watermark, sequenceNumber);
}

/*
 * Account Link Event
 *
 * This event is called when the Link Account or UnLink Account action has been
 * tapped.
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking
 *
 */
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  
  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;
  
  console.log('Received account link event with for user %d with status %s ' +
    'and auth code %s ', senderID, status, authCode);
}

/*
 * Delivery Confirmation Event
 *
 * This event is sent to confirm the delivery of a message. Read more about
 * these fields at https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered
 *
 */
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;
  
  if (messageIDs) {
    messageIDs.forEach(function (messageID) {
      console.log('Received delivery confirmation for message ID: %s',
        messageID);
    });
  }
  
  console.log('All message before %d were delivered.', watermark);
}

/*
 * Authorization Event
 *
 * The value for 'optin.ref' is defined in the entry point. For the "Send to
 * Messenger" plugin, it is the 'data-ref' field. Read more at
 * https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication
 *
 */
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;
  
  // The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
  // The developer can set this to an arbitrary value to associate the
  // authentication callback with the 'Send to Messenger' click event. This is
  // a way to do account linking when the user clicks the 'Send to Messenger'
  // plugin.
  var passThroughParam = event.optin.ref;
  
  console.log('Received authentication for user %d and page %d with pass ' +
    'through param \'%s\' at %d', senderID, recipientID, passThroughParam,
    timeOfAuth);
  
  // When an authentication is received, we'll send a message back to the sender
  // to let them know it was successful.
  fbService.sendTextMessage(senderID, 'Authentication successful');
}

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers['x-hub-signature'];
  
  if (!signature) {
    throw new Error('Couldn\'t validate the signature.');
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];
    
    var expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
      .update(buf)
      .digest('hex');
    
    if (signatureHash != expectedHash) {
      throw new Error('Couldn\'t validate the request signature.');
    }
  }
}

// Spin up the server
app.listen(app.get('port'), function () {
  console.log('running on port', app.get('port'))
})
