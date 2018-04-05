var Client = require('node-xmpp-client');
var EventEmitter = require('events').EventEmitter;
var log = require ('../log');
module.exports = new EventEmitter ();
module.exports.parse = function (msg) { 
	if (!msg) {
		log.info ("NO MESSAGE RECEIVED!");
		return;
	}
	var body = msg.getChildText ('body'), composing = msg.getChild ('composing'), paused = msg.getChild ('paused');
	if (body) { 
		module.exports.emit ("message", msg.attrs, body);
	}
	if (composing) { 
		module.exports.emit ("composing", msg.attrs);
	}
	if (paused) { 
		module.exports.emit ("paused", msg.attrs);
	}
}
module.exports.send = function (from, to, message) {
	var st = new Client.Stanza ("message", {to: to, from: from, type: 'chat'});
	st.c ('body').t (message);
	return st;
}
