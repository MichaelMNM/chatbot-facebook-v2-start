'use strict';

const config = require('../config')
const dialogflow = require('dialogflow')

const credentials = {
  client_email: config.GOOGLE_CLIENT_EMAIL,
  private_key: config.GOOGLE_PRIVATE_KEY,
};

const sessionClient = new dialogflow.SessionsClient(
  {
    projectId: config.GOOGLE_PROJECT_ID,
    credentials
  }
);

async function sendToDialogFlow(sender, sessionId, textString, params) {
  try {
    console.log(config.GOOGLE_PROJECT_ID, sessionId, config.DF_LANGUAGE_CODE)
    const sessionPath = sessionClient.sessionPath(
      config.GOOGLE_PROJECT_ID,
      sessionId
    );
    console.log(sessionPath)
    
    
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: textString,
          languageCode: config.DF_LANGUAGE_CODE,
        },
      },
      queryParams: {
        payload: {
          data: params
        }
      }
    };
    const responses = await sessionClient.detectIntent(request);
    return responses[0].queryResult;
  } catch (e) {
    console.log('error');
    console.log(e);
  }
}

module.exports = {
  sendToDialogFlow
}