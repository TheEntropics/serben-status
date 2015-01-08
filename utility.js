var target;

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
function query(q) {
	connection.query(q, function(err) {
		if (err) {
			console.log("Error executing query: " + q);
			console.log(err);
		}
	});
}

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

var buffers = {
	server_up: false,
	ping_history: [],
	avaiability_success: 0,
	avaiability_samples: 0,
	services: {
		online: {
			tcp: [],
			udp: []
		},
		offline: {
			tcp: [],
			udp: []
		}
	},
	cpu: 0.0,
	cpu_history: [],
	mem: 0.0,
	mem_history: [],
	uptime: 0.0,
	log: []
};

function init(host_ip) {
	target = host_ip;
}


function getBuffer(startDate) {
    if (startDate) start = new Date(startDate);
    else           start = new Date('1970-01-01');

    buff = {
        server_up: buffers.server_up,
        ping_history: [],
        avaiability_success: buffers.avaiability_success,
	    avaiability_samples: buffers.avaiability_samples,
	    services: buffers.services,
	    cpu: buffers.cpu,
	    cpu_history: [],
	    mem: buffers.mem,
	    mem_history: [],
	    uptime: buffers.uptime,
	    log: []
    };

    for (i in buffers.ping_history)
        if (buffers.ping_history[i].date > start)
            buff.ping_history.push(buffers.ping_history[i]);

    for (i in buffers.cpu_history)
        if (buffers.cpu_history[i].date > start)
            buff.cpu_history.push(buffers.cpu_history[i]);

    for (i in buffers.mem_history)
        if (buffers.mem_history[i].date > start)
            buff.mem_history.push(buffers.mem_history[i]);

    return buff;
}

//
//		PING STUFF
//
var net_ping = require ("net-ping");
var session = net_ping.createSession();
PING_HISTORY_SIZE = 500;
function ping() {
	function addPing(up, time) {
		query("INSERT INTO pings (date, up, ping) VALUE (CURRENT_TIMESTAMP, '"+up+"', '"+time+"')");
	}
	function do_ping() {
		session.pingHost (target, function (error, target, sent, rcvd) {
	    	var ms = rcvd - sent;
			if (error) {
				addPing(0, ms);
				buffers.server_up = false;
				console.log("ERROR! The server is DOWN!");
			} else {
				console.log("server is UP! ping:" + ms + "ms");
				addPing(1, ms);
				buffers.server_up = true;
				buffers.ping_history.push({
					date: new Date(),
					ping: ms
				});
				if (buffers.ping_history.length > PING_HISTORY_SIZE)
					array.shift();
				buffers.avaiability_success++;
			}
			buffers.avaiability_samples++;
		});
	}

	// repeat the ping 3 times
	setTimeout(do_ping, 0);
	setTimeout(do_ping, 1000);
	setTimeout(do_ping, 2000);
}
function loadPing() {
	connection.query("SELECT * FROM pings WHERE 1 ORDER BY date DESC LIMIT " + PING_HISTORY_SIZE, function (err, data) {
		if (err) console.log("Error getting old data: " + err);
		else {
			var i = data.length;
			while (i--) {
				buffers.ping_history.push({
					date: data[i].date,
					ping: data[i].ping
				});
				if (data[i].up)
					buffers.avaiability_success++;
				buffers.avaiability_samples++;
			}
		}
	});
}


//
//		NMAP STUFF
//
function nmap() {
	// the query to log the service status
	function addServiceStatus(service, up) {
		query("INSERT INTO services (date, service, status) VALUE (CURRENT_TIMESTAMP, '"+service+"', '"+up+"')");
	}

	// the tcp ports to be scanned
	var tcp_ports = [];
	for (srv in services.tcp) tcp_ports.push(services.tcp[srv]);
	// the udp ports to be scanned
	var udp_ports = [];
	for (srv in services.udp) udp_ports.push(services.udp[srv]);

	// scan the tcp ports
	run_cmd("nmap", [ "--open", "-p"+tcp_ports.join(","), target ], function(res) {
		// parse service port and addd them in the db
		regex = /(\d+)\//gi
		port = res.match(regex);

		// if all ports are closed
		if (!port) port = [];

		// remove the / from the prev regex
		for (p in port) port[p] = port[p].slice(0, -1);
		// reset the buffer
		buffers.services.online.tcp = [];
		buffers.services.offline.tcp = [];
		// select interesting ports and update db
		for (srv in services.tcp) {
			if (array_contains(port, services.tcp[srv])) {
				addServiceStatus(srv, "1");
				buffers.services.online.tcp.push(srv);
			} else {
				addServiceStatus(srv, "0");
				buffers.services.offline.tcp.push(srv);
			}
		}
	});
	// scan the udp ports
	run_cmd("nmap", [ "--open", "-p"+udp_ports.join(","), "-sU", target ], function(res) {
		// parse service port and addd them in the db
		regex = /(\d+)\//gi
		port = res.match(regex);

		// if all ports are closed
		if (!port) port = [];

		for (p in port) port[p] = port[p].slice(0, -1);
		// reset the buffer
		buffers.services.online.udp = [];
		buffers.services.offline.udp = [];
		// select interesting ports and update db
		for (srv in services.udp) {
			if (array_contains(port, services.udp[srv])) {
				addServiceStatus(srv, "1");
				buffers.services.online.udp.push(srv);
			} else {
				addServiceStatus(srv, "0");
				buffers.services.offline.udp.push(srv);
			}
		}
	});
}



//
//		CPU/RAM/UPTIME
//
SYS_HISTORY_LENGHT = 500;

function sysInfo() {
	var request = require("request");
	request("http://"+target+"/status-wrapper.php", function(error, response, body) {
		if (error) console.log("Error retriving sysInfo: " + error);
		else {
			var data = "";
			try {
				data = eval("("+body+")");
			} catch (e) {
				console.log("malformed json: " + body);
				return;
			}
			uptime = (new Date() - new Date(data.uptime))/1000;
			mem = data.mem.used/data.mem.total;
			cpu = data.load;
			query("INSERT INTO sysInfo (date,cpu,ram,uptime) VALUE (CURRENT_TIMESTAMP,'"+cpu+"','"+mem+"',SEC_TO_TIME('"+uptime+"'))");

			buffers.cpu = cpu;
			buffers.mem = mem;
			buffers.uptime = uptime;

			buffers.cpu_history.push({
				date: new Date(),
				load: cpu
			});
			if (buffers.cpu_history.length > SYS_HISTORY_LENGHT)
				buffers.cpu_history.shift();

			buffers.mem_history.push({
				date: new Date(),
				load: mem
			});
			if (buffers.mem_history.length > SYS_HISTORY_LENGHT)
				buffers.mem_history.shift();
		}
	});
}
function loadSysInfo() {
	connection.query("SELECT * FROM sysInfo WHERE 1 ORDER BY date DESC LIMIT " + SYS_HISTORY_LENGHT, function(err, data) {
		if (err) console.log("Error retriving old data: " + err);
		else {
			var i = data.length;
			while (i--) {
				buffers.cpu_history.push({
					date: data[i].date,
					load: data[i].cpu
				});
				buffers.mem_history.push({
					date: data[i].date,
					load: data[i].ram
				});
			}
		}
	});
}


//
//		LOG STUFF
//
LOG_HISTORY_LENGHT = 5;
function loadLog() {
	connection.query("SELECT * FROM log WHERE 1 ORDER BY date DESC LIMIT " + LOG_HISTORY_LENGHT, function(err, data) {
		if (err) console.log("Error retriving the log: " + err);
		buffers.log = [];
		for (l in data) {
			buffers.log.push({
				date: data[l].date,
				level: data[l].level,
				title: data[l].title,
				message: data[l].message
			});
		}
	});
}

exports.ping = ping;
exports.nmap = nmap;
exports.sysInfo = sysInfo;
exports.loadLog = loadLog;

exports.loadPing = loadPing;
exports.loadSysInfo = loadSysInfo;

exports.buffers = buffers;
exports.init = init;
exports.getBuffer = getBuffer;
exports.query = query;
