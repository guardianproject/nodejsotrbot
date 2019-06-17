"use strict";

global.Olm = require('olm');
// Use path and fs
const path = require('path');
const fs = require('fs');
const util = require('util')

const LocalStorageCryptoStore = require('./node_modules/matrix-js-sdk/lib/crypto/store/localStorage-crypto-store').default;

require("./creds.js");

var sdk = require("matrix-js-sdk");
var clc = require("cli-color");
var rivebot = require ("./modules/rivebot");

// Has a directory been given on the command line?
// Otherwise show information message.
var targetDir = process.argv[2];

if(targetDir === undefined) {
  console.log('You need to provide a data path');
  process.exit(1);
}

// Create in memory store
var localpath = path.join(targetDir,'localstorage');

// Loading localStorage module
if (typeof global.localStorage === "undefined" || global.localStorage === null)
    global.localStorage = new (require('node-localstorage').LocalStorage)(localpath);

sdk.setCryptoStoreFactory(() => new LocalStorageCryptoStore(global.localStorage));

var matrixStore = new sdk.MatrixInMemoryStore({localStorage: global.localStorage});
var sessionStore =  new sdk.WebStorageSessionStore(global.localStorage);

var readyToReply = false;

print("creating client for: %s",myBaseUrl);
var matrixClient = sdk.createClient({
    baseUrl: myBaseUrl
});

print("logging in as: %s",myUserId);

matrixClient.login('m.login.password', {user: myUserId, password: myPass, initial_device_display_name: 'Ractive Bot' },  function(err, res) {
          // Console log
          console.log('Logged in as ' + res.user_id);
print("creating full client for token %s and device %s",res.access_token,res.device_id);

  // Create client
matrixClient = sdk.createClient({
    baseUrl: myBaseUrl,
    accessToken: res.access_token,
    userId: myUserId,
    sessionStore: sessionStore,
    store: matrixStore,
    deviceId: myDeviceId
  });

  // Let's start the client.
	   matrixClient.setDeviceDetails(matrixClient.deviceId, "ractive bot");
           matrixClient.setDisplayName(myNick);

	   matrixClient.on("event", handleEvent)
      	   matrixClient.on("Event.decrypted", handleEventDecrypted);

	   print("init matrix crypto");
	   matrixClient.initCrypto();
        setTimeout((() => { 
		print("starting matrix client...");
  matrixClient.startClient({ initialSyncLimit: 0 });
	        matrixClient.getRooms();
		matrixClient.uploadKeys();
	        readyToReply = true;
}).bind(this), 3000);
        }
);


// Data structures
var numMessagesToShow = 0;

// show the room list after syncing.
matrixClient.on("sync",handleSync);

function handleSync(state, prevState, data) {
    switch (state) {
        case "PREPARED":
	
        break;
   }
};


function handleEvent (event)
{
 if (event.isEncrypted()) {
            // Will handle it later in Event.decrypted handler
            return;
        }
//print("HandleEvent: %s",util.inspect(event));

 if (event.getType() === "m.room.message")
	handleIncomingMessage(event);
}


matrixClient.on("RoomMember.membership", function(event, member) {
       if (member.membership === "invite" && member.userId === myUserId) {
           matrixClient.joinRoom(member.roomId).done(function() {
               print("Auto-joined %s", member.roomId);
           });
       }
   });

function handleEventDecrypted (event) 
{
//print("HandleEventDecrypted: %s",util.inspect(event));
try {
   if (event !== 'null' && event !== 'undefined' && event.isDecryptionFailure()) {
	    print("Decryption failure");
	    sendErrorMessage(event.getRoomId());
            return;
        }

 if (event.getType() === "m.room.message")
	handleIncomingMessage(event);
  } catch (ex) {
	print("Decryption error: " + ex);
	sendErrorMessage(event.getRoomId());
  }
	

}


matrixClient.on("Room", function() {
});

// print incoming messages.
matrixClient.on("Room.timeline", function(event, room, toStartOfTimeline) {
    if (toStartOfTimeline) {
        return; // don't print paginated results
    }

    //printLine(event);
    //handleIncomingMessage(event);
});

function handleIncomingMessage (event)
{

if (event.getSender() !== myUserId && readyToReply)
{
 var body = event.getContent().body;
 print("%s says: %s",event.getSender(),body);

 if (typeof body !== 'undefined' && body.length > 0)
 {
     if (body.startsWith("@" + myNick))
     {
    	body = body.substring(myNick.length+1);
	doBotResponse(event.getRoomId(),event.getSender(),body);
     }
 }
 else
 {
	sendErrorMessage(event.getRoomId());


 }
}

}


function sendErrorMessage (roomId)
{
matrixClient.sendTextMessage(roomId, "Sorry I couldn't understand that").catch((err) => {
                                print("err sending message: " + err);
                        })
.catch((err) => {
                    Object.keys(err.devices).forEach((userId) => {
                        print("rivebot set device known for: %s",userId);
                        Object.keys(err.devices[userId]).map((deviceId) => {
    print("rivebot: setting device known for user %s",userId);
                            matrixClient.setDeviceKnown(userId, deviceId, true).
                            catch((err) => {
                                print("err setting device known: " + err);
                                });;
                        });
                    });
                    // Try again
                    matrixClient.sendTextMessage(roomId, body).catch((err) => {
                                print("err sending message: " + err);
                        });
                }).finally(function() {});

}

function doBotResponse (roomId, sender, req)
{
 print("bot is considering a reply...");
 var rep = rivebot.getReply (sender, req);
    print("bot says: %s to room %s",rep,roomId);

            matrixClient.sendTextMessage(roomId, rep)
                .catch((err) => {
                    Object.keys(err.devices).forEach((userId) => {
    			print("device known for: %s",userId);
                        Object.keys(err.devices[userId]).map((deviceId) => {
    print("rivebot: setting device known for user %s",userId);
                            matrixClient.setDeviceKnown(userId, deviceId, true).
			    catch((err) => {
				print("err setting device known: " + err);
				});;
                        });
                    });
                    // Try again
                    matrixClient.sendTextMessage(roomId, rep).catch((err) => {
				print("err sending message AGAIN: " + err);
			});
                }).finally(function() {});
}

function printLine(event) {
    var fmt;
    var name = event.sender ? event.sender.name : event.getSender();
    var time = new Date(
        event.getTs()
    ).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    var separator = "<<<";
    if (event.getSender() === myUserId) {
        name = "Me";
        separator = ">>>";
        if (event.status === sdk.EventStatus.SENDING) {
            separator = "...";
            fmt = clc.xterm(8);
        }
        else if (event.status === sdk.EventStatus.NOT_SENT) {
            separator = " x ";
            fmt = clc.redBright;
        }
    }
    var body = "";

    var maxNameWidth = 15;
    if (name.length > maxNameWidth) {
        name = name.substr(0, maxNameWidth-1) + "\u2026";
    }

    if (event.getType() === "m.room.message") {
        body = event.getContent().body;
    }
    else if (event.isState()) {
        var stateName = event.getType();
        if (event.getStateKey().length > 0) {
            stateName += " ("+event.getStateKey()+")";
        }
        body = (
            "[State: "+stateName+" updated to: "+JSON.stringify(event.getContent())+"]"
        );
        separator = "---";
        fmt = clc.xterm(249).italic;
    }
    else if (event.getType() === "m.room.invite") {
      body = "Woohoo, we got invited to a room " + event.roomId;	
    }
    else {
        // random message event
        body = (
            "[Message: "+event.getType()+" Content: "+JSON.stringify(event.getContent())+"]"
        );
        separator = "---";
        fmt = clc.xterm(249).italic;
    }
    if (fmt) {
        print(
            "[%s] (%s) %s %s %s", time, event.roomId, name, separator, body, fmt
        );
    }
    else {
        print("[%s] (%s) %s %s %s", time, event.roomId, name, separator, body);
    }
}

function print(str, formatter) {
    if (typeof arguments[arguments.length-1] === "function") {
        // last arg is the formatter so get rid of it and use it on each
        // param passed in but not the template string.
        var newArgs = [];
        var i = 0;
        for (i=0; i<arguments.length-1; i++) {
            newArgs.push(arguments[i]);
        }
        var fmt = arguments[arguments.length-1];
        for (i=0; i<newArgs.length; i++) {
            newArgs[i] = fmt(newArgs[i]);
        }
        console.log.apply(console.log, newArgs);
    }
    else {
        console.log.apply(console.log, arguments);
    }
}

function fixWidth(str, len) {
    if (str.length > len) {
        return str.substr(0, len-2) + "\u2026";
    }
    else if (str.length < len) {
        return str + new Array(len - str.length).join(" ");
    }
    return str;
}


