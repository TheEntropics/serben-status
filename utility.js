var target = "5.135.177.211";

function run_cmd(cmd, args, callBack ) {
    var spawn = require('child_process').spawn;
    var child = spawn(cmd, args);
    var resp = "";

    child.stdout.on('data', function (buffer) { resp += buffer.toString() });
    child.stdout.on('end', function() { callBack (resp) });
}


//
//		PING STUFF
//
var net_ping = require ("net-ping");
var session = net_ping.createSession();
function ping() {
	session.pingHost (target, function (error, target, sent, rcvd) {
	    var ms = rcvd - sent;
		if (error) 	addBadPing();
		else		addSuccessPing(ms);
	});
}

function addBadPing() {
	// add a row in the db
}
function addSuccessPing(ms) {
	// add a row in the db
}



//
//		NMAP STUFF
//
function nmap() {
	run_cmd("nmap", [ "--open", "-p10-65500", target ], function(res) {
		// parse service port and addd them in the db
		regex = /(\d+)\//gi
		port = res.match(regex);
		for (p in port) 
			port[p] = port[p].slice(0, -1);
		
	});
}




exports.ping = ping;
exports.nmap = nmap;
