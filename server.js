// SETTINGS
var target = "serben.tk";
var loopTime = 5*1000;

var http = require('http');
var util = require('./utility.js');
// resolve host name
var dns = require('dns');
dns.lookup(target, function onLookup(err, addresses, family) {
	if (err) {
		console.log("Cannot resolve the target: " + err);
		throw new Error("Cannot resolve host ip");
	}
	util.init(addresses);
	console.log("The target is: " + addresses);
});
// start a simple http server
var server = http.createServer(function (req, res) {
	var path = req.url;
	if (path === "/") path = "/index.html";

	if (path === "/data") {
		// serve the dynamic resource
		res.write(JSON.stringify(util.buffers));
		res.end();
		return;
	}

	// serve the static resource
	var url = require('url').parse(path, true);
	var filename = require('path').join("html", url.pathname);
	require('fs').readFile(filename, function(err, file) {
		if(err) {
			res.writeHeader(404);
			res.write("404: FAIIIIL!!");
			res.end();
			console.log("Request: " + path + " - 404");
			return;
		}
		res.writeHeader(200, {
			"Content-Type": require('mime').lookup(filename)
		});
		res.write(file, 'binary');
		res.end();
		console.log("Request: " + path);
	});
});

/**
 * Do the polling to the interested server and update the internal buffer
 */
function loop() {
	// ping the server
	util.ping();
	// do the port scan
	util.nmap();
	// read the cpu/ram/uptime info
	util.sysInfo();
	// load the log
	// TODO
}

/**
 * Load to the internal buffer the old data saved in the database
 */ 
function init() {
	// load the data in the db
	util.loadPing();
	util.loadSysInfo();
	// do a loop
	loop();
}

server.listen(1337, '127.0.0.1');

// wait 2sec before start, the dns has to complete
setTimeout(init, 2*1000);

console.log('Server running at http://127.0.0.1:1337/');
setInterval(loop, 5*1000);
