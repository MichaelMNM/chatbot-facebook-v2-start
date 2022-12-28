'use strict';

const {isDefined} = require('../utils')
const config = require('../config')
const request = require('request')

function sendTextMessage(recipientId, text) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text
    }
  }
  callSendAPI(messageData);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId, imageUrl) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: imageUrl
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Send a Gif using the Send API.
 *
 */
function sendGifMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'image',
        payload: {
          url: config.SERVER_URL + '/assets/instagram_logo.gif'
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Send audio using the Send API.
 *
 */
function sendAudioMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'audio',
        payload: {
          url: config.SERVER_URL + '/assets/sample.mp3'
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 * example videoName: "/assets/allofus480.mov"
 */
function sendVideoMessage(recipientId, videoName) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'video',
        payload: {
          url: config.SERVER_URL + videoName
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Send a video using the Send API.
 * example fileName: fileName"/assets/test.txt"
 */
function sendFileMessage(recipientId, fileName) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'file',
        payload: {
          url: config.SERVER_URL + fileName
        }
      }
    }
  };
  
  callSendAPI(messageData);
}


/*
 * Send a button message using the Send API.
 *
 */
function sendButtonMessage(recipientId, text, buttons) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: text,
          buttons: buttons
        }
      }
    }
  };
  
  callSendAPI(messageData);
}


function sendGenericMessage(recipientId, elements) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: elements
        }
      }
    }
  };
  
  callSendAPI(messageData);
}


function sendReceiptMessage(recipientId, recipient_name, currency, payment_method,
                            timestamp, elements, address, summary, adjustments) {
  // Generate a random receipt ID as the API requires a unique ID
  var receiptId = 'order' + Math.floor(Math.random() * 1000);
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'receipt',
          recipient_name: recipient_name,
          order_number: receiptId,
          currency: currency,
          payment_method: payment_method,
          timestamp: timestamp,
          elements: elements,
          address: address,
          summary: summary,
          adjustments: adjustments
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Send a message with Quick Reply buttons.
 *
 */
function sendQuickReply(recipientId, text, replies, metadata) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text,
      metadata: isDefined(metadata) ? metadata : '',
      quick_replies: replies
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Send a read receipt to indicate the message has been read
 *
 */
function sendReadReceipt(recipientId) {
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: 'mark_seen'
  };
  
  callSendAPI(messageData);
}

/*
 * Turn typing indicator on
 *
 */
function sendTypingOn(recipientId) {
  
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: 'typing_on'
  };
  
  callSendAPI(messageData);
}

/*
 * Turn typing indicator off
 *
 */
function sendTypingOff(recipientId) {
  
  
  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: 'typing_off'
  };
  
  callSendAPI(messageData);
}

/*
 * Send a message with the account linking call-to-action
 *
 */
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: 'Welcome. Link your account.',
          buttons: [{
            type: 'account_link',
            url: config.SERVER_URL + '/authorize'
          }]
        }
      }
    }
  };
  
  callSendAPI(messageData);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v3.2/me/messages',
    qs: {
      access_token: config.FB_PAGE_TOKEN
    },
    method: 'POST',
    json: messageData
    
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      
      if (messageId) {
        console.log('Successfully sent message with id %s to recipient %s',
          messageId, recipientId);
      } else {
        console.log('Successfully called Send API for recipient %s',
          recipientId);
      }
    } else {
      console.error('Failed calling Send API', response.statusCode, response.statusMessage, body.error);
    }
  });
}


module.exports = {
  sendTextMessage,
  sendImageMessage,
  sendGifMessage,
  sendAudioMessage,
  sendVideoMessage,
  sendFileMessage,
  sendButtonMessage,
  sendGenericMessage,
  sendReceiptMessage,
  sendQuickReply,
  sendReadReceipt,
  sendTypingOn,
  sendTypingOff,
  sendAccountLinking,
  callSendAPI
}