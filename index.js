'use strict';

// Imports dependencies and set up http server
const 
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  app = express().use(bodyParser.json()), // creates express http server
  ACCESS_TOKEN = "EAAMCQLDgqWQBAOzEixL9Fbg95IzMRXjVsqTMJu0VyjCCHlsSAkBdml0sI6dMdu7sV5LjuAfYVKmc3YYZAdEXozgEaokFNTik40hKrK8g06sDqVrhPuulLt7ZCChKsGd7KCPy5W09cZAbj466ZCaPhuMbZBemd7ue57yDsunP9Hxj3nsVbgOtC";
  



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

    let body = req.body;
    console.log(JSON.stringify(body) );

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

        // // Iterates over each entry - there may be multiple if batched
        // body.entry.forEach(function(entry) {

        //     // Gets the message. entry.messaging is an array, but 
        //     // will only ever contain one message, so we get index 0
        //     let webhookEvent = entry.messaging[0];

        //     var sender = entry.sender.id;
        //     if(entry.message && entry.message.text) {
        //         var msg_text = entry.message.text;
        //         sendMessage(sender, msg_text, true);
        //     }
        // });

        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});


function sendMessage(receiver, data, isText){
	var payload = {};
	payload = data;
	
	if(isText) {
		payload = {
			text: data
		}
	}

	request({
    url: conf.FB_MESSAGE_URL,
    method: 'POST',
    qs: {
    	access_token: conf.PROFILE_TOKEN
    },
    json: {
      recipient: {id: receiver},
      message: payload
    }
  }, function (error, response) {
  	if(error) console.log('Error sending message: ', error);
  	if(response.body.error) console.log('Error: ', response.body.error);
  });
}

const PORT = process.argv[2] || 5000;
app.listen(PORT, () => {
    console.log(`webhook is listening on port ${PORT}.`)
});