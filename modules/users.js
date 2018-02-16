var EventEmitter = require ('events').EventEmitter;
var log = require ('./log');

var nano = require ('nano') ('http://localhost:5984');

 nano.db.create('keys', function() {
      console.log('you have created the db for keys.')
  });

 nano.db.create('profiles', function() {
      console.log('you have created the db for profiles.')
  });


module.exports = new EventEmitter ();
module.exports.privateKey = function (id, cb, new_k) {
	module.exports.checkDb ('keys', function () { 
		var keys = nano.use ('keys');
		keys.get (id, function (err, k) {
			if (err) {
				//new key!
				// calls new_k callback.
				obj = {_id: id, key: new_k ()};
				keys.insert (obj, function (e, b) {
					log.info ("INSERT ");
					log.info (b);
					if (!e) {
						module.exports.privateKey (id, cb, new_k);
					}
				});
				return;
			}
			cb (k.key);
		});
	});
}
module.exports.update = function (data, cb) { 
	var profiles = nano.use ('profiles');
	try {
		profiles.head (data._id, function (err, _, headers) {
			if (!err) { 
				profiles.insert (data, function (err, body) { 
					if (!err) {
						for (var k in body) { 
							data [k] = body [k];
						}
						cb (data);
					} else {
						log.info ("update failed!!!" + err);
					}
				});
			}
		});
	} catch (e) { 
		log.info ("update fail: " + e);
	}
}
module.exports.load = function (service, id, cb) { 
	module.exports.checkDb ('profiles', function () { 
		var profiles = nano.use ('profiles');
		profiles.get (service+"_"+id, {}, function (err, body) { 
			if (err) {
				profiles.insert ({_id: service+"_"+id, service: service, id: id}, function (err, body) { 
					if (!err) { 
						module.exports.load (service, id, cb);
					}
				});
				return;
			}
			cb (body);
		});
	});
	
}
module.exports.checkDb = function (db, cb, t) { 
	nano.db.get (db, function (err, body) { 
		if (err)  { 
			log.info (err);
			if (!t) {
				nano.db.create (db);
				module.exports.checkDb (db, cb, true);
			}
			return; 
		}
		cb ();
	});
}
