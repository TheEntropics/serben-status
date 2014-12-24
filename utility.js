var target = "5.135.177.211";

var mysql = require("mysql");
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'serben_status',
	password : 'SerbenStatus',
	database : 'serben_status'
});

connection.connect();

function run_cmd(cmd, args, callBack ) {
    var spawn = require('child_process').spawn;
    var child = spawn(cmd, args);
    var resp = "";

    child.stdout.on('data', function (buffer) { resp += buffer.toString() });
    child.stdout.on('end', function() { callBack (resp) });
}
array_contains = function(a, obj) {
    var i = a.length;
    while (i--) 
        if (a[i] === obj)
            return true;
    return false;
};

var services = {
	"tcp": {
		"ssh": "22",
		"ftp": "21",
		"http": "80",
		"pop3": "110",
		"smtp": "25",
		"imap": "143",
		"rdp": "3389",
		"forum": "8088",
		"torrent": "9091",
		"download": "6800",
		"minecraft": "25565",
		"minecraft-alt": "25566",
	},
	"udp": {
		"openarena": "27960",
		"urbanterror": "27961"
	}
};


//
//		PING STUFF
//
var net_ping = require ("net-ping");
var session = net_ping.createSession();
function ping() {
	// do 3 ping requests
	function do_ping() {
		session.pingHost (target, function (error, target, sent, rcvd) {
	    	var ms = rcvd - sent;
			if (error) 	addBadPing();
			else		addSuccessPing(ms);
		});
	}

	setTimeout(do_ping, 0);
	setTimeout(do_ping, 1000);
	setTimeout(do_ping, 2000);
}

function addBadPing() {
	// add a row in the db
	connection.query("INSERT INTO pings (date, up, ping) VALUE (CURRENT_TIMESTAMP, '0', '-1')", function(err){
		if (err) console.log("Error executing a query: " + err);
	});
}
function addSuccessPing(ms) {
	// add a row in the db
	connection.query("INSERT INTO pings (date, up, ping) VALUE (CURRENT_TIMESTAMP, '1', '"+ms+"')", function(err){
		if (err) console.log("Error executing a query: " + err);
	});
}



//
//		NMAP STUFF
//
function nmap() {
	var tcp_ports = [];
	for (srv in services.tcp) tcp_ports.push(services.tcp[srv]);

	var udp_ports = [];
	for (srv in services.udp) udp_ports.push(services.udp[srv]);

	run_cmd("nmap", [ "--open", "-p"+tcp_ports.join(","), target ], function(res) {
		// parse service port and addd them in the db
		regex = /(\d+)\//gi
		port = res.match(regex);
		for (p in port) 
			port[p] = port[p].slice(0, -1);
		// select interesting ports and update db
		for (srv in services.tcp) {
			if (array_contains(port, services.tcp[srv]))
				addServiceStatus(srv, "1");
			else
				addServiceStatus(srv, "0");
		}
	});
	run_cmd("nmap", [ "--open", "-p"+udp_ports.join(","), "-sU", target ], function(res) {
		// parse service port and addd them in the db
		regex = /(\d+)\//gi
		port = res.match(regex);
		for (p in port) 
			port[p] = port[p].slice(0, -1);
		// select interesting ports and update db
		for (srv in services.udp) {
			if (array_contains(port, services.udp[srv]))
				addServiceStatus(srv, "1");
			else
				addServiceStatus(srv, "0");
		}
	});
}

function addServiceStatus(service, up) {
	connection.query("INSERT INTO services (date, service, status) VALUE (CURRENT_TIMESTAMP, '"+service+"', '"+up+"')", function(err) {
		if (err) console.log("Error executing query: " + err);
	});
}


//
//		CPU/RAM/UPTIME
//
function sysInfo() {
	var request = require("request");
	request("http://"+target+"/status-wrapper.php", function(error, response, body) {
		if (error) console.log("Error reriving sysInfo");
		else {
			data = eval("("+body+")");
			uptime = (new Date() - new Date(data.uptime))/1000;
			mem = data.mem.used/data.mem.total;
			connection.query("INSERT INTO sysInfo (date,cpu,ram,uptime) VALUE (CURRENT_TIMESTAMP,'"+data.load+"','"+mem+"',SEC_TO_TIME('"+uptime+"'))", function(err) {
				if (err) console.log("Error executing query: " + err);
			});
		}
	});
}

exports.ping = ping;
exports.nmap = nmap;
exports.sysInfo = sysInfo;
