"use strict";

global.Olm = require('olm');
// Use path and fs
const path = require('path');
const fs = require('fs');

var creds = process.argv[3];
require(creds);

var sdk = require("matrix-js-sdk");
var clc = require("cli-color");
var LocalStorage = require('node-localstorage').LocalStorage;
var rivebot = require ("./modules/rivebot");
var LocalStorageCryptoStore = require('./node_modules/matrix-js-sdk/lib/crypto/store/localStorage-crypto-store').LocalStorageCryptoStore;

var isReady = false;

// Has a directory been given on the command line?
// Otherwise show information message.
var targetDir = process.argv[2];

if(targetDir === undefined) {
  console.log('You need to provide a data path');
 process.exit(1);
}

// Create in memory store
var localpath = path.join(targetDir,'localstorage');
var localStorage = new LocalStorage(localpath);


const sstore =  new sdk.WebStorageSessionStore(localStorage);
//  const cstore = new sdk.MemoryCryptoStore(localStorage);
//     var matrixStore = new sdk.MatrixInMemoryStore({localStorage});

// Loading localStorage module
// if (typeof global.localStorage === "undefined" || global.localStorage === null)
//
const cstore = new LocalStorageCryptoStore(localStorage);
        //sdk.setCryptoStoreFactory(() => cstore);
        sdk.setCryptoStoreFactory(() => cstore);

// Delay startClient() to give initCrypto() a little room to breathe
        // This will delay first event delivery, but shouldn't cause any real problems
var matrixClient = sdk.createClient({ 
	sessionId: "default",
    baseUrl: myBaseUrl,
	  store: new sdk.MemoryStore({ localStorage }),
	        sessionStore: sstore,
	cryptoStore: cstore,
    deviceId: myDeviceId,
    userId: myUserId,
    accessToken: myAccessToken,
});


matrixClient.initCrypto();
matrixClient.startClient();
 // Delay startClient() to give initCrypto() a little room to breathe
//         // This will delay first event delivery, but shouldn't cause any real problems
                 //setTimeout((() => { matrixClient.startClient() }).bind(this), 500);

// Data structures
var roomList = [];
var numMessagesToShow = 0;

// show the room list after syncing.
matrixClient.on("sync", function(state, prevState, data) {
    switch (state) {
        case "PREPARED":
          print("client is prepared!");
matrixClient.on("event", handleEvent)
matrixClient.on("Event.decrypted", handleEventDecrypted)

		    matrixClient.setDeviceDetails(myDeviceId, "zom-bot");
	//	                matrixClient.setDisplayName(myNick);
	//	                matrixClient.setPresence({ presence: "online" });

matrixClient.on("RoomMember.membership", function(event, member) {
	printLine(event);
       if (member && member.membership && member.membership === "invite") {
	   // if (member.roomId)
	       print("joining: " + member.roomId);
           matrixClient.joinRoom(member.roomId).catch((err) => {});
	       matrixClient.setRoomEncryption(member.roomId, { algorithm: 'm.megolm.v1.aes-sha2' })
       }
   });
		        roomList = matrixClient.getRooms();
	  isReady = true; 
		    print("sync is complete");
        break;
   }
});


function handleEvent (event)
{
// print("Got Event: " + event);

 if (isReady && event.getType() === "m.room.message")
	handleIncomingMessage(event);
}

function handleEventDecrypted (event) 
{


   if (event.isDecryptionFailure()) {
            //logger.warn("Decryption failure", { event });
	    print("Decryption failure: " + event);
	  // 	if (isReady)
            //sendMessage(event.getRoomId(), event.getRoomId(), "I couldn't read what you wrote (decryption failed!)");
	   //doBotReponse(event.getRoomId(), event.getRoomId(), "hello");
            return;
        }

 if (event.getType() === "m.room.message")
	handleIncomingMessage(event);
}


function handleIncomingMessage (event)
{

if (event.getSender() !== myUserId)
{
 var body = event.getContent().body;
 print("got message: " + body);

 if (typeof body !== 'undefined' && body !== 'null' && body.length > 0)// && body.startsWith(myNick))
 {
	var count = matrixClient.getRoom(event.getRoomId()).getJoinedMemberCount();

     if (body.toLowerCase().startsWith("@" + myNick))
     {
	     body = body.substring(myNick.length+1);
	doBotReponse(event.getRoomId(),event.getRoomId(),body);
	    }
	 else if (count ==2)
	doBotReponse(event.getRoomId(),event.getRoomId(),body);
		 
 }

}

}

function sendMessage (roomId, sender, body)
{
	print("sending message to " + roomId);
            matrixClient.sendTextMessage(roomId, rep)
                .catch((err) => {
                        if (typeof Object.keys  !== 'undefined' && typeof err.devices  !== 'undefined' ) {
                               print("rivebot: setting devices as known");
                    Object.keys(err.devices).forEach((userId) => {
                        Object.keys(err.devices[userId]).map((deviceId) => {
                               print("rivebot: setting device known for user %s",userId);
                            matrixClient.setDeviceKnown(userId, deviceId, true);
                        });
                    });
                    }
                    // Try again
                    //matrixClient.sendTextMessage(roomId, body);
                });
}



function doBotReponse (roomId, sender, req)
{
 var rep = rivebot.getReply (sender, req);
    print("rivebot says: %s",rep);
            matrixClient.sendTextMessage(roomId, rep)
                .catch((err) => {
                        if (typeof Object.keys  !== 'undefined' && typeof err.devices  !== 'undefined' ) {
                    Object.keys(err.devices).forEach((userId) => {
                        Object.keys(err.devices[userId]).map((deviceId) => {
                               print("rivebot: setting device known for user %s",userId);
                            matrixClient.setDeviceKnown(userId, deviceId, true);
                        });
                    });
                    }
                    // Try again
                    //matrixClient.sendTextMessage(roomId, body);
                });
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
    //ar time = new Date(
    //    event.getTs()
    //).toISOString().replace(/T/, ' ').replace(/\..+/, '');
	var time = event.getTs();
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

