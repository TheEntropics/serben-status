<?php

$uptime = exec("uptime -s", $out, $err);

$load = exec("cat /proc/loadavg", $out, $err);

exec("free", $mem, $err);
$totalMem = array_values(array_filter(split(" ", $mem[1])));
$mem = array_values(array_filter(split(" ", $mem[2])));

$data = array();
$data["uptime"] = $uptime;
$data["load"] = split(" ", $load)[0];
$data["mem"] = array("total" => $totalMem[1], "used" => $mem[2], "free" => $mem[3]); 
echo json_encode($data);
