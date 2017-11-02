'use strict';

// Imports dependencies and set up http server
const
    { FB_PAGE_ACCESS_TOKEN, APIAI_CLIENT} = require("./lib/consts"),
    express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    apiai = require('apiai'),
    apiaiClient = apiai(APIAI_CLIENT, {language: "en", requestSource: "fb"}),
    cheerio = require("cheerio"),
    connectDB = require('./db'),
    Redis = require('ioredis'),
    redis = new Redis('redis://h:p1ba3d42e0402d1d4dc9966806293dcac7914373ba1963f477924a8025cfa1f6c@ec2-34-206-181-153.compute-1.amazonaws.com:58069');
    
const start = async () => {
    // 3
    const DB = await connectDB();
    var app = express();
    app = express();
    app.use(bodyParser.json());

    // app.set('view engine', 'pug')
    // app.use(express.static('public'))

    // app.get('/', async function (req, res) {
    //     const db = await MongoClient.connect("mongodb://127.0.0.1:27017/codingbot")
    //     const result = await db.collection('answers').findOne({"title": "if..else"});

    //     request({
    //         uri: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else",
    //     }, function(error, response, body) {
    //         var $ = cheerio.load(body);

    //         // var x = $("article#wikiArticle");

    //         console.log(x.html());
    //         // var x = $(".answer .answercell .post-text").first();
    //         // x.html(x.html().replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    //         // x.find('pre').each(function () {
    //         //     var qw = $(this);
    //         //     qw.addClass('prettyprint');
    //         // });
    //         res.render('index', { title: result.title, message: result.body, code: x.html() })
        
    //     });
    // })


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
        
        // Check the webhook event is from a Page subscription
        if (body.object === 'page') {
    
            // Iterate over each entry - there may be multiple if batched
            body.entry.forEach(function(entry) {
    
                // Get the webhook event. entry.messaging is an array, but 
                // will only ever contain one event, so we get index 0
                let webhook_event = entry.messaging[0];
               
                // Get the sender PSID
                let sender_psid = webhook_event.sender.id;
    
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
                if (response.result.action == "querySyntax"){
                    redis.set(sender_psid, response.result.fulfillment.speech)                
                    if (response.result.metadata.intentName == "HTML") {
                        response = {
                            "attachment":{
                              "type":"template",
                              "payload":{
                                "template_type":"button",
                                "text":response.result.fulfillment.speech.split("+").join(" "),
                                "buttons":[
                                  {
                                    "type":"web_url",
                                    "url": "https://devdocs.io/#q=" + response.result.fulfillment.speech,
                                    "title": "The Answer",
                                    "webview_height_ratio": "tall"
                                  }
                                ]
                              }
                            }
                        }
                    }
    
                    // Send the response message
                    callSendAPI(sender_psid, response, askForRate);
                } else if (response.result.action == "rating") {
                    const rate = response.result.parameters.number;
    
                    console.log(rate);
                    if (rate >= 1 && rate <= 5) {
                        redis.get(sender_psid, async function (err, result) {
                            await DB.keywordDB.addrating(result, rate);
                            sendText(sender_psid, "Thank you");
                            redis.del(sender_psid);
                        });
                    } else {
                        sendText(sender_psid, "Please rate between 1 and 5");                    
                        askForRate(sender_psid);
                    }
                } else {
                    // Send the response message
                    sendText(sender_psid, response.result.fulfillment.speech);
                }
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
                        },
                        {
                            "type":"web_url",
                            "url":"https://devdocs.io/#q=javascript+if",
                            "title":"Select Criteria",
                            "webview_height_ratio": "tall",
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
    
    
    function callSendAPI(sender_psid, response, cb) {
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
            "qs": { "access_token": FB_PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body
        }, (err, res, body) => {
            if (!err) {
                console.log('message sent!')
            } else {
                console.error("Unable to send message:" + err);
            }
            if (cb) cb(sender_psid);
        }); 
    }
    
    function sendText(sender_psid, text) {
    
        const response = {
            text,
        }
    
        // Send the response message
        callSendAPI(sender_psid, response);
    }
    
    
    function askForRate(sender_psid) {
        const response = {
            "text": "Please Rate",
            "quick_replies": [
                {
                    "content_type": "text",
                    "title": "1",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_RED"
                },
                {
                    "content_type": "text",
                    "title": "2",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
                },
                {
                    "content_type": "text",
                    "title": "3",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
                },
                {
                    "content_type": "text",
                    "title": "4",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
                },
                {
                    "content_type": "text",
                    "title": "5",
                    "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_GREEN"
                }
            ]
        }
    
        callSendAPI(sender_psid, response);
    
    }

    const PORT = process.argv[2] || 5000;
    app.listen(PORT, () => {
        console.log(`CodingBot server running on port ${PORT}.`)
    });
};




// 5
start();