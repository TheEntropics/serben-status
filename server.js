var http = require('http');
var util = require('./utility.js');

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
	console.log("Loop");
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

init();

console.log('Server running at http://127.0.0.1:1337/');
setInterval(loop, 5*1000);
