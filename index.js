'use strict';

// Imports dependencies and set up http server
const
    { FB_PAGE_ACCESS_TOKEN, APIAI_CLIENT } = require("./lib/consts"),
    express = require('express'),
    bodyParser = require('body-parser'),
    apiai = require('apiai'),
    cheerio = require("cheerio"),
    rp = require('request-promise-native'),
    connectDB = require('./db'),
    apiaiClient = apiai(APIAI_CLIENT, {language: "en", requestSource: "fb"});

const start = async () => {
    // 3
    const DB = await connectDB();
    var app = express();
    app = express();
    app.use(bodyParser.json());

    // app.set('view engine', 'pug')
    // app.use(express.static('public'))

    // app.get('/', async function (req, res) {

    //     console.log(req.query);


    //     const result = await DB.keywordDB.getKeyword(req.query);

    //     // request({
    //     //     uri: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else",
    //     // }, function(error, response, body) {
    //     //     var $ = cheerio.load(body);

    //     //     // var x = $("article#wikiArticle");

    //     //     console.log(x.html());
    //     //     // var x = $(".answer .answercell .post-text").first();
    //     //     // x.html(x.html().replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    //     //     // x.find('pre').each(function () {
    //     //     //     var qw = $(this);
    //     //     //     qw.addClass('prettyprint');
    //     //     // });
    //     //     res.render('index', { title: result.title, message: result.body, code: x.html() })
        
    //     // });

    //     console.log (result.difintion);
    //     res.render('index', { title: result.keyword + " | " + result.language, difintion: result.difintion, details: result.details, examples: result.examples })
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
            for (var i in body.entry) {
                // Gets the body of the webhook event
                let webhook_event = body.entry[i].messaging[0];
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
            }
    
            // Return a '200 OK' response to all events
            res.status(200).send('EVENT_RECEIVED');
    
        } else {
            // Return a '404 Not Found' if event is not from a page subscription
            res.sendStatus(404);
        }
    
    });


    async function handleMessage(sender_psid, received_message) {

        
        let response;
        
        if (received_message.quick_reply) {
        
            let payload = JSON.parse(received_message.quick_reply.payload);
            
            if (payload.action == "setDefaultLang"){
                await DB.userDB.setDefaultLang(sender_psid, payload.language);            
                await sendText(sender_psid, "done");
            } else if (payload.action == "rating") {

                if (payload.rate >= 1 && payload.rate <= 5) {
                    await DB.keywordDB.addrating(payload.language, payload.keyword, payload.rate);
                    await sendText(sender_psid, "Thank you");
                } else {
                    await sendText(sender_psid, "Please rate between 1 and 5");                    
                    await askForRate(sender_psid);
                }
            } else if (payload.action == "queryAttributeFromTag") {
                
                await typeOn(sender_psid);
                
                const result = await DB.keywordDB.getKeyword(payload.language, payload.keyword);
                            
                var re = "";
                
                for (var i = 0; i < result.attributes.length; i++) {
                    console.log(result.attributes[i].name)
                    if(result.attributes[i].name == payload.attribute) {
                        re = result.attributes[i].detail;
                        break;
                    }
                }
                
                re = re.split("\\n");

                for (var i in re) {
                    if (re[i].length > 1) {
                        await sendText(sender_psid, re[i]);
                    }
                }

                await typeOff(sender_psid);

            } else if (payload.action == "listAttributeFromTag") {
                
                await typeOn(sender_psid);
                
                const result = await DB.keywordDB.getKeyword({ keyword: payload.keyword, language: payload.language });
                                                
                if (result.attributes.length - startAt <= 11) {
    
                    let response = {
                        "text": "Choose Attribute You want",
                        "quick_replies": []
                    }
    
                    for (var i = startAt; i < result.attributes.length; i++) {
                        response.quick_replies.push({
                            "content_type": "text",
                            "title": result.attributes[i].name,
                            "payload": JSON.stringify({
                                action: "queryAttributeFromTag",
                                language: "html",
                                keyword: payload,
                                attribute: result.attributes[i].name
                            })
                        });
                    }
    
                    await callSendMessageAPI(sender_psid, response); 
                    
                } else if (result.attributes.length - startAt > 11) {
                    let response = {
                        "text": "Choose Attribute You want",
                        "quick_replies": []
                    }
    
                    for (var i = startAt; i < startAt + 10; i++) {
                        response.quick_replies.push({
                            "content_type": "text",
                            "title": result.attributes[i].name,
                            "payload": JSON.stringify({
                                action: "queryAttributeFromTag",
                                language: "html",
                                keyword: payload,
                                attribute: result.attributes[i].name
                            })
                        });
                    }
    
                    response.quick_replies.push({
                        "content_type": "text",
                        "title": "more",
                        "payload": JSON.stringify({
                            action: "listAttributeFromTag",
                            language: payload.language,
                            keyword: payload.keyword,
                            startAt: startAt+10,
                        })
                    });
    
    
                    await callSendMessageAPI(sender_psid, response); 
                }
            }

            
        }
            // Checks if the message contains text
        else if (received_message.text) {
            
            // Create the payload for a basic text message, which
            // will be added to the body of our request to the Send API
            var apiaiRequest = apiaiClient.textRequest(received_message.text, {
                sessionId: sender_psid,
            });
    
            apiaiRequest.on('response', async function(response) {
                if (response.result.action == "querySyntax"){
                    console.log(response.result.parameters);

                    await typeOn(sender_psid);
                    const result = await DB.keywordDB.getKeyword(response.result.parameters);

                    console.log(result);
                    response = {
                        "attachment":{
                            "type":"template",
                            "payload":{
                            "template_type":"button",
                            "text": result.difintion,
                            "buttons":[
                                    {
                                        "type":"web_url",
                                        "url": result.link,
                                        "title": "More Details",
                                        "webview_height_ratio": "tall"
                                    },
                                    {
                                        "type":"postback",
                                        "title": "examples",
                                        "payload": "examples"
                                    },
                                    {
                                        "type":"postback",
                                        "title": "attributes",
                                        "payload": response.result.parameters.keyword
                                    }
                                ]
                            }
                        }
                    }

                    // Send the response message
                    await callSendMessageAPI(sender_psid, response);
                    await askForRate(sender_psid, response.result.parameters.keyword, response.result.parameters.language);
                    await typeOff(sender_psid);
                } else if (response.result.action == "listAttributesFromTag") {
                    await typeOn(sender_psid);
                    
                    const result = await DB.keywordDB.getKeyword(response.result.parameters);
                                        
                    if (result.attributes.length == 0) {
                        await sendText(sender_psid, "It have only the global attributes");
                    } else {
                        var re = [];
                        
                        for (var i = 0; i < result.attributes.length; i++) {
                            re.push(result.attributes[i].name);
                        }
                        
                        await sendQuickReplies(sender_psid, "Choose Attribute You want", re);
                        
                    }
                    await typeOff(sender_psid);
                } else if (response.result.action == "queryAttribute"){
                    console.log(response.result.parameters);                            
                    await typeOn(sender_psid);

                    const result = await DB.keywordDB.getKeyword(response.result.parameters);
                    
                
                    var re = "";
                    
                    for (var i = 0; i < result.attributes.length; i++) {
                        console.log(result.attributes[i].name)
                        if(result.attributes[i].name == response.result.parameters.attributeName) {
                            re = result.attributes[i].detail;
                            break;
                        }
                    }
                    
                    re = re.split("\\n");

                    for (var i in re) {
                        if (re[i].length > 1) {
                            await sendText(sender_psid, re[i]);
                        }
                    }

                    await typeOff(sender_psid);
                } else {
                    // Send the response message
                    await sendText(sender_psid, response.result.fulfillment.speech);
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
            await callSendMessageAPI(sender_psid, response);
        }    
    }
    
    
    async function handlePostback(sender_psid, received_postback) {
            
        // Get the payload for the postback
        let payload = received_postback.payload;
        let title = received_postback.title;
    
        // Set the response based on the postback payload
        if (payload === 'getstarted') {

            var body = await rp({
                "uri": "https://graph.facebook.com/v2.6/" + sender_psid,
                "qs": { "access_token": FB_PAGE_ACCESS_TOKEN },
                "method": "GET",
                json: true,
            })

            await DB.userDB.adduser(sender_psid, body.first_name);                    
            await sendText(sender_psid, "Welcome " + body.first_name + "\u000AI'am CodingBot, And I'am here To help you in coding");
            
            const response = {
                "text": "Please tell me what programming language you want to know \u000Aunfortunately we only support Html and Css for now But we want to expand to other language in the future",
                "quick_replies": [
                    {
                        "content_type": "text",
                        "title": "html",
                        "payload": JSON.stringify({
                            action: "setDefaultLang",
                            language: "html"
                        })
                    },
                    {
                        "content_type": "text",
                        "title": "css",
                        "payload": JSON.stringify({
                            action: "setDefaultLang",
                            language: "css"
                        })
                    }
                ]
            }
            await callSendMessageAPI(sender_psid, response); 
        } else if (payload === 'yes') {
            await sendText(sender_psid, "Thanks!");
        } else if (payload === 'no') {
            await sendText(sender_psid, "Oops, try sending another image.");
        } else if (title === 'attributes') {

            await typeOn(sender_psid);
            
            const result = await DB.keywordDB.getKeyword({ keyword: payload, language: "html" });
                                            
            if (result.attributes.length == 0) {
                await sendText(sender_psid, "It have only the global attributes");
            } else if (result.attributes.length <= 11) {

                let response = {
                    "text": "Choose Attribute You want",
                    "quick_replies": []
                }

                for (var i = 0; i < result.attributes.length; i++) {
                    response.quick_replies.push({
                        "content_type": "text",
                        "title": result.attributes[i].name,
                        "payload": JSON.stringify({
                            action: "queryAttributeFromTag",
                            language: "html",
                            keyword: payload,
                            attribute: result.attributes[i].name
                        })
                    });
                }

                await callSendMessageAPI(sender_psid, response); 
                
            }else if (result.attributes.length > 11) {
                let response = {
                    "text": "Choose Attribute You want",
                    "quick_replies": []
                }

                for (var i = 0; i < 10; i++) {
                    response.quick_replies.push({
                        "content_type": "text",
                        "title": result.attributes[i].name,
                        "payload": JSON.stringify({
                            action: "queryAttributeFromTag",
                            language: "html",
                            keyword: payload,
                            attribute: result.attributes[i].name
                        })
                    });
                }

                response.quick_replies.push({
                    "content_type": "text",
                    "title": "more",
                    "payload": JSON.stringify({
                        action: "listAttributeFromTag",
                        language: "html",
                        keyword: payload,
                        startAt: 10,
                    })
                });


                await callSendMessageAPI(sender_psid, response); 

            }

            await typeOff(sender_psid);

        }
    }
    

    async function typeOn(sender_psid) {
        
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "sender_action":"typing_on"
        }
    
        await callSendAPI(request_body, sender_psid);
    }
    
    async function typeOff(sender_psid) {
        
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "sender_action":"typing_off"
        }
    
        await callSendAPI(request_body, sender_psid);
    
    }


    async function callSendMessageAPI(sender_psid, response) {
        // Construct the message body
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "message": response
        }
    
        await callSendAPI(request_body, sender_psid);
    }

    async function callSendAPI(request_body, sender_psid) {

        // Send the HTTP request to the Messenger Platform
        await rp({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": FB_PAGE_ACCESS_TOKEN },
            "method": "POST",
            "json": request_body
        })

        console.log('message sent!');
    }
    
    async function sendText(sender_psid, text) {
    
        const response = {
            text,
        }
    
        // Send the response message
        await callSendMessageAPI(sender_psid, response);
    }
    
    async function askForRate(sender_psid, keyword, language) {

        var response = {
            "text": title,
            "quick_replies": [
                {
                    "content_type": "text",
                    "title": "1",
                    "payload": JSON.stringify({
                        action: "rating",
                        data: { 
                            rate: 1,
                            keyword,
                            language
                        }
                    })
                },
                {
                    "content_type": "text",
                    "title": "2",
                    "payload": JSON.stringify({
                        action: "rating",
                        data: { 
                            rate: 2,
                            keyword,
                            language
                        }
                    })
                },
                {
                    "content_type": "text",
                    "title": "3",
                    "payload": JSON.stringify({
                        action: "rating",
                        data: { 
                            rate: 3,
                            keyword,
                            language
                        }
                    })
                },
                {
                    "content_type": "text",
                    "title": "4",
                    "payload": JSON.stringify({
                        action: "rating",
                        data: { 
                            rate: 4,
                            keyword,
                            language
                        }
                    })
                },
                {
                    "content_type": "text",
                    "title": "5",
                    "payload": JSON.stringify({
                        action: "rating",
                        data: { 
                            rate: 5,
                            keyword,
                            language
                        }
                    })
                }
            ]
        }
    
        await callSendMessageAPI(sender_psid, response);
    
    }

    const PORT = process.argv[2] || 5000;
    app.listen(PORT, () => {
        console.log(`CodingBot server running on port ${PORT}.`)
    });
};




// 5
start();