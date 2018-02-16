var EventEmitter = require ('events').EventEmitter;
var log = require ('./log');
module.exports = new EventEmitter ();

var RiveScript = require ("rivescript"), buddies = {};
var parser = new RiveScript ({
	debug: true,
	onDebug: function (msg) { log.info ("RIVESCRIPT DEBUG: " + msg); }
});

//parser.loadDirectory (__dirname + "/../rivescripts/", success, error);
parser.loadDirectory (process.env.RIVESCRIPTS, success, error);

function success (cnt) { 
	log.info ("RIVEBOT succesfully loaded directory")
	parser.sortReplies ();
}
function error (cnt, err) {
	log.info ("ERROR!!! RIVESCRIPT: " + cnt + err );
}
module.exports.getReply = function (user, msg) {
	log.info ("User: " + user + "\nMsg: " + msg);
	parser.setUservars (user, {});
	return parser.reply (user, msg); 
}
