'use strict';

// Imports dependencies and set up http server
const 
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  apiai = require('apiai'),
  app = express().use(bodyParser.json()),  // creates express http server
  apiaiClient = apiai("1f56152188f646b38ab963a7111d2168", {language: "en", requestSource: "fb"}),
  PAGE_ACCESS_TOKEN = "EAAMCQLDgqWQBAOzEixL9Fbg95IzMRXjVsqTMJu0VyjCCHlsSAkBdml0sI6dMdu7sV5LjuAfYVKmc3YYZAdEXozgEaokFNTik40hKrK8g06sDqVrhPuulLt7ZCChKsGd7KCPy5W09cZAbj466ZCaPhuMbZBemd7ue57yDsunP9Hxj3nsVbgOtC";

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "secret"
    
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
    
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
        // Checks the mode and token sent is correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            
            // Responds with the challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        
        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);      
        }
    }
});

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {  

    // Parse the request body from the POST
    let body = req.body;
    console.log(JSON.stringify(body) );
    
    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {

        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {

            // Get the webhook event. entry.messaging is an array, but 
            // will only ever contain one event, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
            

            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);


            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);        
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });

        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});


function handleMessage(sender_psid, received_message) {
    let response;

    // Checks if the message contains text
    if (received_message.text) {
        
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API
        var apiaiRequest = apiaiClient.textRequest(received_message.text, {
            sessionId: sender_psid,
        });

        apiaiRequest.on('response', function(response) {
            response = {
                "text": response
            }
            
            // Send the response message
            callSendAPI(sender_psid, response);
        });

        apiaiRequest.on('error', function(error) {
            console.log(error);
        });
         
        apiaiRequest.end();

        
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Is this the right picture?",
                    "subtitle": "Tap a button to answer.",
                    "image_url": attachment_url,
                    "buttons": [
                    {
                        "type": "postback",
                        "title": "Yes!",
                        "payload": "yes",
                    },
                    {
                        "type": "postback",
                        "title": "No!",
                        "payload": "no",
                    }
                    ],
                }]
                }
            }
        }

        // Send the response message
        callSendAPI(sender_psid, response);
    }    
}


function handlePostback(sender_psid, received_postback) {
    
    let response;

    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { "text": "Thanks!" }
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another image." }
    }
    
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}


function callSendAPI(sender_psid, response) {
    console.log(sender_psid,  response)

    // Construct the message body
    let request_body = {
        "recipient": {
        "id": sender_psid
        },
        "message": response
    }

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('message sent!')
        } else {
            console.error("Unable to send message:" + err);
        }
    }); 
}



const PORT = process.argv[2] || 5000;
app.listen(PORT, () => {
    console.log(`webhook is listening on port ${PORT}.`)
});