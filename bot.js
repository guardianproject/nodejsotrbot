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

var matrixClient = sdk.createClient({
    store: matrixStore,
    sessionStore: sessionStore,
    baseUrl: myBaseUrl,
    accessToken: myAccessToken,
    userId: myUserId,
    deviceId: myDeviceId
});


// Data structures
var roomList = [];
var numMessagesToShow = 0;

matrixClient.startClient();

// show the room list after syncing.
matrixClient.on("sync",handleSync);

function handleSync(state, prevState, data) {
    switch (state) {
        case "PREPARED":
	   matrixClient.setDeviceDetails(matrixClient.deviceId, "ractive bot");
           matrixClient.setDisplayName(myNick);

	   matrixClient.on("event", handleEvent)
      	   matrixClient.on("Event.decrypted", handleEventDecrypted);

	   print("init matrix crypto");
	   matrixClient.initCrypto();
        setTimeout((() => { 
		print("starting matrix client...");
		matrixClient.startClient() 
                setRoomList();
		matrixClient.uploadKeys();
	        readyToReply = true;
}).bind(this), 1000);
	
        break;
   }
};


function handleEvent (event)
{
 if (event.isEncrypted()) {
            // Will handle it later in Event.decrypted handler
            return;
        }
print("HandleEvent: %s",util.inspect(event));

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
print("HandleEventDecrypted: %s",util.inspect(event));
try {
   if (event !== 'null' && event !== 'undefined' && event.isDecryptionFailure()) {
	    print("Decryption failure");
	    //sendErrorMessage();
            return;
        }

 if (event.getType() === "m.room.message")
	handleIncomingMessage(event);
  } catch (ex) {
	print("Decryption error: " + ex);
	sendErrorMessage();
  }
	

}


matrixClient.on("Room", function() {
    setRoomList();
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
     if (body.startsWith(myNick))
     {
    	body = body.substring(myNick.length+1);
	doBotReponse(event.getRoomId(),event.getSender(),body);
     }
 }
 else
 {
	sendErrorMessage();


 }
}

}


function sendErrorMessage ()
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

function doBotReponse (roomId, sender, req)
{
 var rep = rivebot.getReply (sender, req);
    print("rivebot says: %s to room %s",rep,roomId);
            matrixClient.sendTextMessage(roomId, rep)
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

function setRoomList() {
    roomList = matrixClient.getRooms();
    roomList.sort(function(a,b) {
        // < 0 = a comes first (lower index) - we want high indexes = newer
        var aMsg = a.timeline[a.timeline.length-1];
        if (!aMsg) {
            return -1;
        }
        var bMsg = b.timeline[b.timeline.length-1];
        if (!bMsg) {
            return 1;
        }
        if (aMsg.getTs() > bMsg.getTs()) {
            return 1;
        }
        else if (aMsg.getTs() < bMsg.getTs()) {
            return -1;
        }
        return 0;
    });
}

function printRoomList() {
    print("Room List:");
    var fmts = {
        "invite": clc.cyanBright,
        "leave": clc.blackBright
    };
    for (var i = 0; i < roomList.length; i++) {
        var msg = roomList[i].timeline[roomList[i].timeline.length-1];
        var dateStr = "---";
        var fmt;
        if (msg) {
            dateStr = new Date(msg.getTs()).toISOString().replace(
                /T/, ' ').replace(/\..+/, '');
        }
        var myMembership = roomList[i].getMyMembership();
        if (myMembership) {
            fmt = fmts[myMembership];
        }
        var roomName = fixWidth(roomList[i].name, 25);
        print(
            "[%s] %s (%s members)  %s",
            i, fmt ? fmt(roomName) : roomName,
            roomList[i].getJoinedMembers().length,
            dateStr
        );
    }
}

function printMemberList(room) {
    var fmts = {
        "join": clc.green,
        "ban": clc.red,
        "invite": clc.blue,
        "leave": clc.blackBright
    };
    var members = room.currentState.getMembers();
    // sorted based on name.
    members.sort(function(a, b) {
        if (a.name > b.name) {
            return -1;
        }
        if (a.name < b.name) {
            return 1;
        }
        return 0;
    });
    print("Membership list for room \"%s\"", room.name);
    print(new Array(room.name.length + 28).join("-"));
    room.currentState.getMembers().forEach(function(member) {
        if (!member.membership) {
            return;
        }
        var fmt = fmts[member.membership] || function(a){return a;};
        var membershipWithPadding = (
            member.membership + new Array(10 - member.membership.length).join(" ")
        );
        print(
            "%s"+fmt(" :: ")+"%s"+fmt(" (")+"%s"+fmt(")"), 
            membershipWithPadding, member.name, 
            (member.userId === myUserId ? "Me" : member.userId),
            fmt
        );
    });
}

function printRoomInfo(room) {
    var eventDict = room.currentState.events;
    var eTypeHeader = "    Event Type(state_key)    ";
    var sendHeader = "        Sender        ";
    // pad content to 100
    var restCount = (
        100 - "Content".length - " | ".length - " | ".length - 
        eTypeHeader.length - sendHeader.length
    );
    var padSide = new Array(Math.floor(restCount/2)).join(" ");
    var contentHeader = padSide + "Content" + padSide;
    print(eTypeHeader+sendHeader+contentHeader);
    print(new Array(100).join("-"));
    Object.keys(eventDict).forEach(function(eventType) {
        if (eventType === "m.room.member") { return; } // use /members instead.
        Object.keys(eventDict[eventType]).forEach(function(stateKey) {
            var typeAndKey = eventType + (
                stateKey.length > 0 ? "("+stateKey+")" : ""
            );
            var typeStr = fixWidth(typeAndKey, eTypeHeader.length);
            var event = eventDict[eventType][stateKey];
            var sendStr = fixWidth(event.getSender(), sendHeader.length);
            var contentStr = fixWidth(
                JSON.stringify(event.getContent()), contentHeader.length
            );
            print(typeStr+" | "+sendStr+" | "+contentStr);
        });
    })
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


