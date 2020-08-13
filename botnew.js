process.chdir(__dirname);

const MatrixClient = require("matrix-bot-sdk").MatrixClient;
const AutojoinRoomsMixin = require("matrix-bot-sdk").AutojoinRoomsMixin;
var os = require('os');

var config = require('config');
var access_token = "";
var homeserver = "";
var bot_user = "";
if (!( config.has('access_token') && config.has('homeserver') && config.has('bot_user'))) {
    console.log("config fields required: access_token, homeserver, bot_user");
    process.exit(1);
}

access_token = config.get('access_token');
homeserver = config.get('homeserver');
bot_user = config.get('bot_user');

loggingRoom = config.has('logging_room') ? config.get('logging_room') : undefined;

const client = new MatrixClient(homeserver, access_token);
AutojoinRoomsMixin.setupOnClient(client);
client.start().then(() => console.log("Client started!"));

var rivebot = require ("./modules/rivebot");

var ractives = {};

sendLog(`Started on ${os.hostname}`);

function sendLog(message) {
    if (loggingRoom) {
        client.sendMessage(loggingRoom, {
            "msgtype": "m.notice",
            "body": message
        });
    }
    else {
        console.log(message);
    }
}

async function startRactive(roomId) {
    sendLog(`startRactive for ${roomId}`);
    delete ractives[roomId];

    var power = await client.userHasPowerLevelFor(bot_user, roomId, "m.room.message")

    ractives[roomId] = {
        last: (new Date()).getTime()
    }

    var resp = rivebot.getReply (roomId, "hello");

    client.sendMessage(roomId, {
        "msgtype": "m.notice",
        "body": resp
    });
}

client.on("room.join", (roomId) => {
    sendLog(`Got join event for ${roomId}`);
    if (process.uptime() < 10) {
        return;
    }
    startRactive(roomId);
});

client.on("room.message", (roomId, event) => {
    // early exit reasons
    if (! event.content) return;
    if (event.sender === bot_user) return;
    if (event.sender === bot_user) return;
    if (event.sender === "@server:matrix.org") return;
    if (event.unsigned.age > 1000 * 60) return; // older than a minute
    if (roomId === loggingRoom) return;
    // var sender = await client.getUserId();
    // if (event["sender"] === sender) return;

    //console.log(event.sender + " says " + event.content.body);
    if (!ractives[roomId] || (new Date()).getTime() - ractives[roomId].last > 1000 * 60 * 5) {
        startRactive(roomId);
    }
    ractives[roomId].last = (new Date()).getTime();

    var responseText = rivebot.getReply (roomId, event.content.body);

            if (response.reply) { responseText = response.reply; }
            if (response.final) { responseText = response.final; }

            client.sendMessage(roomId, {
                "msgtype": "m.notice",
                "body": responseText,
                "responds": {
                    "sender": event.sender,
                    "message": event.content.body
                }
            }).then((eventId) => {
                if (response.final) {
                    client.leaveRoom(roomId);
                }
            });
});
