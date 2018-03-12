var Client = require('node-xmpp-client');
var log = require ("../log");
var EventEmitter = require('events').EventEmitter;
module.exports = new EventEmitter ();
module.exports.parse = function (stanza) { 
	if (!stanza) return;
	if (stanza.attrs && stanza.attrs.type) { 
		module.exports.emit (stanza.attrs.type, stanza.attrs);
	}
}
module.exports.acceptSubscription = function (to) { 
	return new Client.Stanza ("presence", {"to": to, "type": "subscribed"});
}
module.exports.requestSubscription = function (to) { 
	return new Client.Stanza ("presence", {"to": to, "type": "subscribe"});
}
