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

        if (received_message.quick_reply) {
        
            let payload = JSON.parse(received_message.quick_reply.payload);
            
            if (payload.action == "queryAttributeFromTag") {

                await typeOn(sender_psid);
                
                await queryAttributeFromTag(sender_psid, payload.keyword, payload.attribute);
                
                await typeOff(sender_psid);
                
            } else if (payload.action == "listAttributeFromTag") {
                
                await typeOn(sender_psid);
                
                listAttributeFromTag(sender_psid, payload.keyword, payload.startAt)

                await typeOff(sender_psid);
                
                
            } else if (payload.action == "queryExampleFromTag") {
                
                await typeOn(sender_psid);

                await queryExampleFromTag(sender_psid, payload.keyword, payload.example);
                
                await typeOff(sender_psid);

            } else if (payload.action == "listExampleFromTag") {
                
                await typeOn(sender_psid);

                listExampleFromTag(sender_psid, payload.keyword, payload.startAt)
                
                await typeOff(sender_psid);                    
                
            } else if (payload.action == "listTagsFromAttribute") {
                
                await typeOn(sender_psid);
                
                const result = await DB.keywordDB.getKeyword({ keyword: payload.keyword, language: payload.language, keywordkind: "attribute"  });
                                                
                if (result.tags.length - payload.startAt <= 11) {
    
                    let response = {
                        "text": "Choose tag You want",
                        "quick_replies": []
                    }
    
                    for (var i = payload.startAt; i < result.tags.length; i++) {

                        response.quick_replies.push({
                            "content_type": "text",
                            "title": result.tags[i],
                            "payload": JSON.stringify({
                                action: "queryAttributeFromTag",
                                language: "html",
                                keyword: result.tags[i],
                                attribute: payload.keyword
                            })
                        });
                    }
    
                    await callSendMessageAPI(sender_psid, response); 
                    
                } else if (result.examples.length - payload.startAt > 11) {
                    let response = {
                        "text": "Choose example You want",
                        "quick_replies": []
                    }
    
                    for (var i = payload.startAt; i < payload.startAt + 10; i++) {
                        response.quick_replies.push({
                            "content_type": "text",
                            "title": result.tags[i],
                            "payload": JSON.stringify({
                                action: "queryAttributeFromTag",
                                language: "html",
                                keyword: payload.keyword,
                                example: result.examples[i].title
                            })
                        });
                    }
    
                    response.quick_replies.push({
                        "content_type": "text",
                        "title": "more",
                        "payload": JSON.stringify({
                            action: "listTagsFromAttribute",
                            language: payload.language,
                            keyword: payload.keyword,
                            startAt: payload.startAt+10,
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


                    if (response.result.parameters.keywordkind == "tag") {

                        var response = {
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
                                            "payload": JSON.stringify({
                                                action: "listExampleFromTag",
                                                language: response.result.parameters.language,
                                                keyword: response.result.parameters.keyword
                                            })
                                        },
                                        {
                                            "type":"postback",
                                            "title": "attributes",
                                            "payload": JSON.stringify({
                                                action: "listAttributeFromTag",
                                                language: response.result.parameters.language,
                                                keyword: response.result.parameters.keyword
                                            })
                                        }
                                    ]
                                }
                            }
                        }

                        await callSendMessageAPI(sender_psid, response);                        

                    } else {

                        if (result.tags.length == 1) {
                            
                            const resultattr = await DB.keywordDB.getKeyword({keyword: result.tags[0], language: response.result.parameters.language, keywordkind: "tag" });
                            
                            var re = "";
                            
                            for (var i = 0; i < resultattr.attributes.length; i++) {
                                console.log(resultattr.attributes[i].name)
                                if(resultattr.attributes[i].name == response.result.parameters.keyword) {
                                    re = resultattr.attributes[i].detail;
                                    break;
                                }
                            }
                            
                            console.log("re:  " + re);

                            re = re.split("\n");
            
                            for (var i in re) {
                                if (re[i].length > 1) {
                                    await sendText(sender_psid, re[i]);
                                }
                            }
                         
                        
                        } else if (result.tags.length <= 11) {
            
                            let ourresponse = {
                                "text": "Choose tag You want",
                                "quick_replies": []
                            }
            
                            for (var i = 0; i < result.tags.length; i++) {
                                ourresponse.quick_replies.push({
                                    "content_type": "text",
                                    "title": result.tags[i],
                                    "payload": JSON.stringify({
                                        action: "queryAttributeFromTag",
                                        language: "html",
                                        keyword: result.tags[i],
                                        attribute: response.result.parameters.keyword
                                    })
                                });
                            }
                                       
                           await callSendMessageAPI(sender_psid, ourresponse);
                           
                        } else if (result.tags.length > 11) {
                            let ourresponse = {
                                "text": "Choose tag You want",
                                "quick_replies": []
                            }
            
                            for (var i = 0; i < 10; i++) {
                                ourresponse.quick_replies.push({
                                    "content_type": "text",
                                    "title": result.tags[i],
                                    "payload": JSON.stringify({
                                        action: "queryAttributeFromTag",
                                        language: "html",
                                        keyword: result.tags[i],
                                        attribute: response.result.parameters.keyword
                                    })
                                });
                            }
            
                            ourresponse.quick_replies.push({
                                "content_type": "text",
                                "title": "more",
                                "payload": JSON.stringify({
                                    action: "listTagsFromAttribute",
                                    language: "html",
                                    keyword: response.result.parameters.keyword,
                                    startAt: 10,
                                })
                            });
            
                           await callSendMessageAPI(sender_psid, ourresponse);
                    
                        }
            
                    }

                    // Send the response message
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
        let payload = JSON.parse(received_postback.payload);
    
        // Set the response based on the postback payload
        if (payload.action == 'getstarted') {

            var body = await rp({
                "uri": "https://graph.facebook.com/v2.6/" + sender_psid,
                "qs": { "access_token": FB_PAGE_ACCESS_TOKEN },
                "method": "GET",
                json: true,
            })

            await DB.userDB.adduser(sender_psid, body.first_name);                    
            await sendText(sender_psid, "Welcome " + body.first_name + "\u000AI'am CodingBot, And I'am here To help you in coding\u000ACurrntly I we only support HTML/CSS But We will support more languages in the future");
        
        } else if (payload === 'yes') {
            await sendText(sender_psid, "Thanks!");
        } else if (payload === 'no') {
            await sendText(sender_psid, "Oops, try sending another image.");
        } else if (payload.action == 'listAttributeFromTag') {

            await typeOn(sender_psid);
            
            await listAttributeFromTag(sender_psid, payload.keyword, 0);

            await typeOff(sender_psid);

        }  else if (payload.action == 'listExampleFromTag') {

            await typeOn(sender_psid);
            
            listExampleFromTag(sender_psid, payload.keyword, 0)
            
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
    


    async function queryAttributeFromTag(sender_psid, tag, attribute) {
        const result = await DB.keywordDB.getKeyword({ keyword: tag, language: "html", keywordkind: "tag" });
        
        var re = "";
        
        for (var i = 0; i < result.attributes.length; i++) {
            console.log(result.attributes[i].name)
            if(result.attributes[i].name == attribute) {
                re = result.attributes[i].detail;
                break;
            }
        }
        
        re = re.split("\n");

        for (var i in re) {
            if (re[i].length > 1) {
                await sendText(sender_psid, re[i]);
            }
        }    
    
    }

    async function listAttributeFromTag(sender_psid, tag, startAt) {

        const result = await DB.keywordDB.getKeyword({ keyword: tag, language: "html", keywordkind: "tag" });
        
        if (startAt == 0 && result.attributes.length == 0) {
            await sendText(sender_psid, "It have only the global attributes");            
        } else if (result.attributes.length - startAt <= 11) {

            let response = {
                "text": "Choose Attribute You want",
                "quick_replies": []
            }


            


            for (var i = startAt; i < result.attributes.length; i++) {
                var img = null;
                
                if (result.attributes[i].status == "obsolete"){
                    img = "https://upload.wikimedia.org/wikipedia/commons/f/f1/Ski_trail_rating_symbol_red_circle.png";
                } else if (result.attributes[i].status == "html5") {
                    img = "https://html5hive.org/wp-content/uploads/2014/05/a-guide-to-html5-and-css3-379x284.png?x30206";
                } else if (result.attributes[i].status == "deprecated") {
                    img = "http://www.cureffi.org/wp-content/uploads/2013/09/deprecated.png";
                } else if (result.attributes[i].status == "not standardized") {
                    img = "https://upload.wikimedia.org/wikipedia/commons/f/f1/Ski_trail_rating_symbol_red_circle.png";                            
                } else if (result.attributes[i].status == "experimental") {
                    img = "https://www.nesta.org.uk/sites/default/files/styles/large/public/lab-flask-ts-rf-400px_2.jpg?itok=iRmRcl8y";                            
                }


                response.quick_replies.push({
                    "content_type": "text",
                    "title": result.attributes[i].name,
                    "image_url": img,
                    "payload": JSON.stringify({
                        action: "queryAttributeFromTag",
                        language: "html",
                        keyword: tag,
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

                var img = null;
                
                if (result.attributes[i].status == "obsolete"){
                    img = "https://upload.wikimedia.org/wikipedia/commons/f/f1/Ski_trail_rating_symbol_red_circle.png";
                } else if (result.attributes[i].status == "html5") {
                    img = "https://html5hive.org/wp-content/uploads/2014/05/a-guide-to-html5-and-css3-379x284.png?x30206";
                } else if (result.attributes[i].status == "deprecated") {
                    img = "http://www.cureffi.org/wp-content/uploads/2013/09/deprecated.png";
                } else if (result.attributes[i].status == "not standardized") {
                    img = "https://upload.wikimedia.org/wikipedia/commons/f/f1/Ski_trail_rating_symbol_red_circle.png";                            
                } else if (result.attributes[i].status == "experimental") {
                    img = "https://www.nesta.org.uk/sites/default/files/styles/large/public/lab-flask-ts-rf-400px_2.jpg?itok=iRmRcl8y";                            
                }


                response.quick_replies.push({
                    "content_type": "text",
                    "title": result.attributes[i].name,
                    "image_url":img,
                    "payload": JSON.stringify({
                        action: "queryAttributeFromTag",
                        language: "html",
                        keyword: tag,
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
                    keyword: tag,
                    startAt: startAt+10,
                })
            });


            await callSendMessageAPI(sender_psid, response); 
        }
        
    }


    async function listExampleFromTag(sender_psid, tag, startAt) {

        const result = await DB.keywordDB.getKeyword({ keyword: tag, language: "html", keywordkind: "tag" });

        if (startAt == 0 && result.examples.length == 0) {
            await sendText(sender_psid, "It have no example");
        } else if (startAt == 0 && result.examples.length == 1) {
                                        
            var re = result.examples[0];
            
            if (re.detail) {
                var response = re.detail.split("\n");
                for (var i in response) {
                    if (response[i].length > 1) {
                        await sendText(sender_psid, response[i]);
                    }
                }
            }

            var code;

            if (re.code.length < 635){
                code = "```html\u000A" + re.code.replace(/\\n/g, '\u000A');
            } else {
                code = "```html\u000A" + re.code.substring(0, 600).replace(/\\n/g, '\u000A') + "\u000APlease Continue From More Details";
            }

            var ourresponse = {
                "attachment":{
                    "type":"template",
                    "payload":{
                    "template_type":"button",
                    "text": code,
                    "buttons":[
                            {
                                "type":"web_url",
                                "url": re.link,
                                "title": "More Details",
                                "webview_height_ratio": "tall"
                            }
                        ]
                    }
                }
            }

            // Send the response message
            await callSendMessageAPI(sender_psid, ourresponse);



            if (re.note) {
                var response = re.note.split("\n");
                for (var i in response) {
                    if (response[i].length > 1) {
                        await sendText(sender_psid, response[i]);
                    }
                }
            }            
        
        } else if (result.examples.length - startAt <= 11) {

            let response = {
                "text": "Choose example You want",
                "quick_replies": []
            }

            for (var i = startAt; i < result.examples.length; i++) {
                response.quick_replies.push({
                    "content_type": "text",
                    "title": result.examples[i].title,
                    "payload": JSON.stringify({
                        action: "queryExampleFromTag",
                        language: "html",
                        keyword: tag,
                        example: result.examples[i].title
                    })
                });
            }

            await callSendMessageAPI(sender_psid, response); 
        
        } else if (result.examples.length - startAt > 11) {
            let response = {
                "text": "Choose example You want",
                "quick_replies": []
            }

            for (var i = startAt; i < startAt + 10; i++) {
                response.quick_replies.push({
                    "content_type": "text",
                    "title": result.examples[i].title,
                    "payload": JSON.stringify({
                        action: "queryExampleFromTag",
                        language: "html",
                        keyword: tag,
                        example: result.examples[i].title
                    })
                });
            }

            response.quick_replies.push({
                "content_type": "text",
                "title": "more",
                "payload": JSON.stringify({
                    action: "listExampleFromTag",
                    language: "html",
                    keyword: tag,
                    startAt: startAt+10,
                })
            });


            await callSendMessageAPI(sender_psid, response); 
        }


    }


    async function queryExampleFromTag(sender_psid, tag, example) {

        const result = await DB.keywordDB.getKeyword({ keyword: tag, language: "html", keywordkind: "tag" });
                
        var re;
        
        for (var i = 0; i < result.examples.length; i++) {
            if(result.examples[i].title == example) {
                re = result.examples[i]
                break;
            }
        }

        if (re.detail) {
            var response = re.detail.split("\n");
            for (var i in response) {
                if (response[i].length > 1) {
                    await sendText(sender_psid, response[i]);
                }
            }
        }


        var code;

        if (re.code.length < 635){
            code = "```html\u000A" + re.code.replace(/\\n/g, '\u000A');
        } else {
            code = "```html\u000A" + re.code.substring(0, 600).replace(/\\n/g, '\u000A') + "\u000APlease Continue From More Details";
        }

        var ourresponse = {
            "attachment":{
                "type":"template",
                "payload":{
                "template_type":"button",
                "text": code,
                "buttons":[
                        {
                            "type":"web_url",
                            "url": re.link,
                            "title": "More Details",
                            "webview_height_ratio": "tall"
                        }
                    ]
                }
            }
        }

        // Send the response message
        await callSendMessageAPI(sender_psid, ourresponse);


        if (re.note) {
            var response = re.note.split("\n");
            for (var i in response) {
                if (response[i].length > 1) {
                    await sendText(sender_psid, response[i]);
                }
            }
        }
    }

    const PORT = process.argv[2] || 5000;
    app.listen(PORT, () => {
        console.log(`CodingBot server running on port ${PORT}.`)
    });
};




// 5
start();