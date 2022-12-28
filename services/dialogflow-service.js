'use strict';

const {jsonToStructProto} = require('../utils')
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

async function sendTextToDialogFlow(sender, sessionId, textString, params) {
  try {
    const sessionPath = sessionClient.sessionPath(
      config.GOOGLE_PROJECT_ID,
      sessionId
    );
    
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

const sendEventToDialogFlow = async (sender, sessionId, event, params = {}) => {
  const sessionPath = sessionClient.sessionPath(
    config.GOOGLE_PROJECT_ID,
    sessionId
  );
  try {
    const request = {
      session: sessionPath,
      queryInput: {
        event: {
          name: event,
          parameters: jsonToStructProto(params),
          languageCode: config.DF_LANGUAGE_CODE
        }
      }
    }
    
    const responses = await sessionClient.detectIntent(request)
    return responses[0].queryResult
  } catch (error) {
    console.error(error)
  }
}

module.exports = {
  sendTextToDialogFlow,
  sendEventToDialogFlow
}