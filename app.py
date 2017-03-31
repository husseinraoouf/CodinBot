# coding=utf-8


from __future__ import print_function

import os
import sys
import json
import requests
from lxml import etree, html
import time
import urllib2
import urllib
# import MySQLdb
from flask import Flask, flash, redirect, render_template, request, session, url_for
from flask_session import Session
from tempfile import gettempdir
from flask.ext.cache import Cache
import psycopg2

try:
    import apiai
except ImportError:
    sys.path.append(
        os.path.join(
            os.path.dirname(os.path.realpath(__file__)),
            os.pardir,
            os.pardir
        )
    )

    import apiai


db = psycopg2.connect("dbname=d9da6vma4ujg4f user=yduxizxrktqgdd password=2a500c838a85582fff1eaadaf8bce0fc7aefd87dc48689f0f2c984f3929e15ac host=ec2-107-22-223-6.compute-1.amazonaws.com")

cur = db.cursor()

userID = -1
session = []


tree = etree.HTML("<html></html>")
urlqq = "https://coding-bot1.herokuapp.com/"

# demo agent acess token: e5dc21cab6df451c866bf5efacb40178

CLIENT_ACCESS_TOKEN = '5b61af54b792422f9d9a0a7f1764c899'
ACCESS_TOKEN = "EAACiSdcnLu4BAPKMYY0XQYMMpYZCBv6ABsxEsIzd2U2y8be5vGhHrdlBzJqIPllELJSxN6idBzY5tCr6SsV0LxF6qu4jNxk9udZAindLsaVzdTyKZBveZB9yAmAu3Ivs7ZCCO6hZAKb5TUzgp3S6Wcf3pn1BW1Tthl93HooFNC1QZDZD"

app = Flask(__name__)
ai = apiai.ApiAI(CLIENT_ACCESS_TOKEN)

# Check Configuring Flask-Cache section for more details
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

app.config["CACHE_TYPE"] = "null"
# change to "redis" and restart to cache again

# some time later
cache.init_app(app)

# All caching functions will simply call through
# to the wrapped function, with no caching
# (since NullCache does not cache).
# ensure responses aren't cached


def reply(msg):
    data = {
        "recipient": {"id": userID},
        "message": {"text": msg}
    }
    resp = requests.post(
        "https://graph.facebook.com/v2.6/me/messages?access_token=" + ACCESS_TOKEN, json=data)
    typeOff()

def typeOff():
    data = {
        "recipient": {"id": userID},
        "sender_action":"typing_off"
    }
    resp = requests.post(
        "https://graph.facebook.com/v2.6/me/messages?access_token=" + ACCESS_TOKEN, json=data)

def typeOn():
    data = {
        "recipient": {"id": userID},
        "sender_action":"typing_on"
    }
    resp = requests.post(
        "https://graph.facebook.com/v2.6/me/messages?access_token=" + ACCESS_TOKEN, json=data)


def rate():

    data = {"recipient": {"id": userID},
            "message": {
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
    }}

    resp = requests.post(
        "https://graph.facebook.com/v2.6/me/messages?access_token=" + ACCESS_TOKEN, json=data)

    typeOff()



def sendURL(url, title):

    data = {"recipient": {"id": userID},
            "message":{
                "attachment":{
                  "type":"template",
                  "payload":{
                    "template_type":"button",
                    "text":"The Answer",
                    "buttons":[
                      {
                        "type":"web_url",
                        "url": url,
                        "title": title,
                        "webview_height_ratio": "tall"
                      }
                    ]
                  }
                }
    }}
    # reply("URL : " + url)
    resp = requests.post(
        "https://graph.facebook.com/v2.6/me/messages?access_token=" + ACCESS_TOKEN, json=data)

    typeOff()


@app.route('/', methods=['GET'])
def handle_verification():
    return request.args['hub.challenge']


@app.route('/answer', methods=['GET'])
def pages():
    global userID
    xx = request.args['xx']
    userID = request.args['id']

    cur.execute(
        "SELECT * FROM session WHERE question = %s AND senderID = %s", (xx, userID))
    if cur.rowcount > 0:
        re = cur.fetchone()
        # print (re[3])
        checkbl = checkblacklist(re[3])
        if checkbl:
            return render_template("answer.html", title=xx, body=re[2])

    else:
        cur.execute("SELECT * FROM answers WHERE question = %s ORDER BY stars DESC", [xx])
        re = cur.fetchall()
        for one in re:
            checkbl = checkblacklist(one[3])
            if checkbl:
                return render_template("answer.html", title=xx, body=one[2])


@app.route('/', methods=['POST'])
def handle_incoming_messages():
    global userID
    data = request.json
    if data['object'] == "page":
        for entry in data['entry']:
            pageID = entry['id']
            for msg in entry['messaging']:
                try:
                    userID = msg['sender']['id']
                    message = msg['message']['text']
                    loadSession()
                    requesta = ai.text_request()
                    requesta.query = message
                    response = json.loads(requesta.getresponse().read())
                    result = response['result']
                    action = result.get('action')
                    actionIncomplete = result.get(
                        'actionIncomplete', False)

                    typeOn()
                    if (action == "query_syntax"):
                        askForRate()
                        xx = response['result']['fulfillment']['speech']

                        # reply("querying work")
                        # reply(session[0])
                        search(xx)

                        db.commit()
                    elif (action == "rating"):
                        xx = response['result']['fulfillment']['speech']

                        # reply("rateing work")
                        # reply(session[0])
                        if xx.isdigit():
                            xx = int(xx)

                            if xx <= 5 and xx >= 0:
                                deleteSession()
                                cur.execute(
                                    "SELECT * FROM answers WHERE source = %s", [session[3]])

                                aa = 1
                                stars = xx
                                if cur.rowcount > 0:
                                    re = cur.fetchone()
                                    aa = re[6] + 1
                                    stars = re[5] + stars*re[6]
                                    cur.execute(
                                        "UPDATE answers SET stars= %s , numRated = %s WHERE question = %s", (stars/aa, aa, session[1]))

                                else:
                                    cur.execute("INSERT INTO answers (question, answer,source, kind, stars, numRated) VALUES (%s, %s, %s,'asd', %s, %s)", (
                                        session[1], session[2], session[3], stars, aa))

                                db.commit()

                                if xx <= 2:
                                    cur.execute(
                                        "SELECT * FROM blacklist WHERE link = %s", [session[3]])
                                    if cur.rowcount > 0 + 1 >= 20:
                                        cur.execute(
                                            "INSERT INTO blacklist (userID, question,link) VALUES (%s, %s, %s)", (0, session[1], session[3]))
                                    cur.execute("INSERT INTO blacklist (userID, question,link) VALUES (%s, %s, %s)", (
                                        session[0], session[1], session[3]))
                                    db.commit()

                                    search(session[1])

                                elif xx > 2:
                                    reply("Thanks")
                                    return "ok"

                            else:
                                reply("Please Enter A Number between 1 and 5")

                        else:
                            reply("Please Enter A Number between 1 and 5")
                            # search(xx)
                            #
                            # db.commit()

                    else:
                        askForRate()
                        reply(response['result']['fulfillment']['speech'])

                    return "ok"
                except:
                    return "ok"

    return "ok"

def chekSession():
    cur.execute("SELECT * FROM session WHERE senderID = %s", [userID])
    if cur.rowcount > 0:
        return True
    else:
        return False

def askForRate():
    checks = chekSession()
    if checks:
        reply("Please Rate First")
        rate()
        sys.exit()
        return "ok"



def deleteSession():
    cur.execute("DELETE FROM session WHERE senderID = %s", [userID])
    db.commit()


def loadSession():
    global session
    cur.execute("SELECT * FROM session WHERE senderID = %s", [userID])
    if cur.rowcount > 0:
        session = cur.fetchone()
        # reply("sessionss" + str(session[1]))


def out(answer, source, quetion):
    cur.execute("INSERT INTO session (senderID, question,answer, source) VALUES (%s, %s, %s, %s)",
                (userID, quetion, answer, source))
    db.commit()
    word = {'xx': quetion, 'id': userID}
    word = urllib.urlencode(word)
    url = urlqq + '/answer?' + word
    sendURL(url, quetion)
    rate()


def fetchhtml(url):
    page = requests.get(url)
    return etree.HTML(page.content)


def fetchjson(url):
    page = requests.get(url)
    return json.loads(page.content)


def scrapddg(url):
    data = fetchjson(url)

    for here in ["Abstract", "AbstractText"]:
        checkbl = checkblacklist(here)
        if checkbl:
            if data[here]:
                return [data[here], here]

    for one in data['RelatedTopics']:
        if len(one) > 2:
            url = one['FirstURL']
            checkbl = checkblacklist(url)
            if checkbl:
                return [one['Text'], url]

    return False


def scrapstackoverflow(url):
    global tree
    tree = fetchhtml(url)
    span = tree.find(
        './/div[@class="answer accepted-answer"]//div[@class="post-text"]')
    if span == None:
        span = tree.find('.//div[@class="answer"]//div[@class="post-text"]')
    if span == None:
        return False
    # return etree.tostring(span, method="text", encoding="UTF-8")
    return etree.tostring(span, encoding="UTF-8")


def checkblacklist(url):
    cur.execute(
        "SELECT * FROM blacklist WHERE link = %s AND (userID = %s OR userID = '0')", (url, userID))
    if cur.rowcount == 0:
        return True
    return False


def scrapddgresult(xx):
    results = [a.get('href')
               for a in tree.cssselect('#links .links_main h2 a')]
    for a in results:
        a = a[15:]
        urla = urllib.unquote(a).decode('utf8')
        # reply(urla)
        checkbl = checkblacklist(urla)
        if checkbl:
            # reply(urla)
            scrap = scrapstackoverflow(urla)
            if scrap:
                # cur.execute("INSERT INTO session (senderID, question,source) VALUES (%s, %s, %s)", (userID, xx, urla))
                # db.commit()
                # print(scrap)
                out(scrap, urla, xx)

                return "ok"
                break


def search(xx):
    global tree
    cur.execute("SELECT * FROM answers WHERE question = %s ORDER BY stars DESC", [xx] )
    re = cur.fetchall()

    if cur.rowcount > 0:
        for one in re:
            checkbl = checkblacklist(one[3])
            if checkbl:
                out(one[2], one[3], xx)
                # print re[2]
                # cur.execute("INSERT INTO session (senderID, question,source) VALUES (%s, %s, %s)", (userID, xx, re[3]))
                return "ok"

    word = {'q': xx, 'format': 'json'}

    word = urllib.urlencode(word)
    url = 'https://api.duckduckgo.com/?' + word

    # reply(url)
    scrap = scrapddg(url)
    if scrap:

        out(scrap[0], scrap[1], xx)
        # print scrap[0]
        # cur.execute("INSERT INTO session (senderID, question,source) VALUES (%s, %s, %s)", (userID, xx, scrap[1]))
        return "ok"

    word = {'q': xx + ' site:https://stackoverflow.com'}

    word = urllib.urlencode(word)

    url = 'https://beta.duckduckgo.com/html?' + word

    # print (url)

    tree = fetchhtml(url)

    # checkbl = checkblacklist(url)
    # if checkbl:
    #     scrap = scrapddg(url)
    #     if scrap:
    #         print scrap
    #         cur.execute("INSERT INTO session (senderID, question,source) VALUES (%s, %s, %s)", (userID, xx, url))
    #         print("rate: ")
    #         return "ok"
    #
    #     scrapddgresult(xx)

    scrapddgresult(xx)


if __name__ == '__main__':
    app.run(debug=True)
