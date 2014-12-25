console.log("script loaded");

var serviceNames = {
	"ssh": ["SSH", "services"],
	"ftp": ["FTP", "services"],
	"http": ["Web Server", "services"],
	"pop3": ["POP3 Server", "services"],
	"smtp": ["SMTP Server", "services"],
	"imap": ["IMAP Server", "services"],
	"rdp": ["Remote Desktop", "services"],
	"forum": ["forum.serben.tk", "services"],
	"torrent": ["Transmission", "services"],
	"download": ["Download Manager", "services"],
	"minecraft": ["Minecraft", "games"],
	"minecraft-alt": ["Minecraft Alternative", "games"],
	"openarena": ["OpenArena", "games"],
	"urbanterror": ["UrbanTerror", "games"]
};

var cpu_chart;
var mem_chart;
var chart_options;

$(document).ready(function() {
	google.setOnLoadCallback(cpu);
	loadData();
	setInterval(loadData, 3000);
	cpu_chart = new google.visualization.Gauge(document.getElementById('cpu-perc'));
	mem_chart = new google.visualization.Gauge(document.getElementById('ram-perc'));
	chart_options = {
		width: 190, height: 190,
		redFrom: 90, redTo: 100,
		yellowFrom: 75, yellowTo: 90,
		minorTicks: 5,
		animation: {
			duration: 1000
		}
	}
});



function loadData() {
	$.ajax({
		url: "/data",
		dataType: "json",
		success: function(data) {
			server_up(data.server_up);
			uptime(data.uptime);
			
			srv = [];
			for (d in data.services.online.tcp) srv.push([data.services.online.tcp[d], true]);
			for (d in data.services.online.udp) srv.push([data.services.online.udp[d], true]);
			for (d in data.services.offline.tcp) srv.push([data.services.offline.tcp[d], false]);
			for (d in data.services.offline.udp) srv.push([data.services.offline.udp[d], false]);
			services(srv);

			cpu_history(data.cpu_history);
			cpu(data.cpu);
			
			mem_history(data.mem_history);			
			mem(data.mem);

			av = data.avaiability_success/data.avaiability_samples;
			avaiability((av*100).toFixed(2)+"%");
		}, error: function(err) {
			console.log(err);
		}
	});
};

function server_up(up) {
	if (up) {
		$("#server-up").attr("class", "alert alert-success col-md-8");
		$("#server-up span").text(" is up!");
	} else {
		$("#server-up").attr("class", "alert alert-danger col-md-8");
		$("#server-up span").text(" is down!");
	}
}
function uptime(time) {
	$("#uptime").text(uptimeFormatter(time*1000));
}
function services(srv) {
	$("#services").html("");
	$("#games").html("");
	for (s in srv) {
		var info = serviceNames[srv[s][0]];
		if (info === undefined) info = [srv[s][0], "services"];

		var div = $("<div>");
		div.addClass("service");
		if (srv[s][1]) 	div.addClass("service-online");
		else			div.addClass("service-offline");
		div.html(info[0]);

		$("#"+info[1]).append(div);
	}	
}

function cpu_history(cpu) {
	for (d in cpu) cpu[d].date = new Date(cpu[d].date);
	data_graphic({
		title: "",
		description: "",
		data: cpu,
		width: $("#cpu-graph").width(),
		height: $("#cpu-perc").height(),
		target: '#cpu-graph',
	    x_accessor: 'date',
	    y_accessor: 'load',
		format: 'percentage',
		interpolate: 'linear'
	});
}
function cpu(cpu_usage) {
	var data = google.visualization.arrayToDataTable([
		[ "CPU", parseFloat(cpu_usage)*100|0 ] 
	], true);
	cpu_chart.draw(data, chart_options);
}
function mem_history(mem) {
	for (d in mem) mem[d].date = new Date(mem[d].date);
	data_graphic({
		title: "",
		description: "",
		data: mem,
		width: $("#ram-graph").width(),
		height: $("#ram-perc").height(),
		target: '#ram-graph',
	    x_accessor: 'date',
	    y_accessor: 'load',
		format: 'percentage',
		interpolate: 'linear'
	});
}
function mem(mem_usage) {
	var data = google.visualization.arrayToDataTable([
		[ "RAM", parseFloat(mem_usage)*100|0 ] 
	], true);
	mem_chart.draw(data, chart_options);
}

function avaiability(av) {
	$("#avaiability").text(av);
}

function uptimeFormatter(time) {
	var days = Math.floor(time / (1000 * 60 * 60 * 24));
	time -=  days * (1000 * 60 * 60 * 24);

	var hours = Math.floor(time / (1000 * 60 * 60));
	time -= hours * (1000 * 60 * 60);

	var mins = Math.floor(time / (1000 * 60));
	time -= mins * (1000 * 60);

	var seconds = Math.floor(time / (1000));
	time -= seconds * (1000);

	return days + " days, " + hours + " hours, " + mins + " minutes, " + seconds + " seconds";
}
