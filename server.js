/*
 * Questo file si occupa di gestire il server web, accettare le richieste
 * e processare i dati letti dal buffer
 * Richiede il file utility.js
 */ 

// SETTINGS
var target = "serben.tk";
var loopTime = 60*1000;
var iface = '0.0.0.0';
var port = 1337;

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

	if (path.match(/^\/data/)) {
	    startDate = undefined;
	    if (path.length > 5 && path[5] == '/')
	        startDate = path.substr(6);

		// serve the dynamic resource
		res.setHeader('Content-Type', "application/json");
		res.write( JSON.stringify( util.getBuffer(startDate) ) );
		res.end();

		loop();

		return;
	}

	// serve the static resource
	var url = require('url').parse(path, true);
	var filename = require('path').join("html", url.pathname);
	require('fs').readFile(filename, function(err, file) {
		if(err) {
			require('fs').readFile('html/404.html', function(err, file) {
				if (err) {
					res.writeHeader(404);
					res.write("404: FAIIIIL!!");
					res.end();
				} else {
					res.writeHeader(404, {
						"Content-Type": "text/html"
					});
					res.write(file, 'binary');
					res.end();
				}
			});
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
	util.loadLog();
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

function formatDate(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanup() {
    deleteBefore = new Date();
    deleteBefore.setHours(deleteBefore.getHours() - 6);
    deleteBefore = formatDate(deleteBefore);
    console.log("DROP DATA BEFORE ", deleteBefore);
    util.query("DELETE FROM pings WHERE up=1 AND date<'" + deleteBefore + "'");
    util.query("DELETE FROM services WHERE status=1 AND date<'" + deleteBefore + "'");
    util.query("DELETE FROM sysInfo WHERE date<'" + deleteBefore + "'");
}

server.listen(port, iface);

// wait 2sec before start, the dns has to complete
setTimeout(init, 2*1000);
// every 30min clean up the database
setTimeout(cleanup, 30*60*1000);
cleanup();

console.log('Server running at http://'+iface+':'+port+'/');
setInterval(loop, loopTime);
