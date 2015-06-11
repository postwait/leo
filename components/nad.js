var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var url = require('url');

var nadURL = "http://updates.circonus.net/node-agent/packages/";

module.exports = function Nad() {
    this.checkType = "json";

    this.isDefault = true;
    this.displayname = "Node.js Agent";
    this.description = "CPU, disk, memory, and network metrics via Node.js Agent";

    this.defaultMetrics = {
        "nad": ["cpu`idle`steal", "cpu`kernel", "cpu`user", "cpu`wait_io", "disk`loop0`nread", "disk`loop0`nwritten", "disk`loop0`reads", "disk`loop0`writes", "if`eth0`in_bytes", "if`eth0`in_errors", "if`eth0`out_bytes", "if`eth0`out_errors", "vm`memory`total", "vm`memory`used", "vm`swap`free", "vm`swap`used"]
    };

    this.defaultGraphs = [
        {
            "title": "CPU Usage - ",
            "datapoints": [
                { "bundle": "nad", "metric_name": "cpu`idle`steal", "name": "Idle Steal"},
		{ "bundle": "nad", "metric_name": "cpu`kernel", "name": "Kernel" },
                { "bundle": "nad", "metric_name": "cpu`user",   "name": "User" },
		{ "bundle": "nad", "metric_name": "cpu`wait_io", "name": "I/O Wait"},
            ]
        },
	{
	    "title": "Memory - ",
	    "datapoints": [
		{ "bundle": "nad", "metric_name": "vm`memory`total", "name": "Memory Total"},
		{ "bundle": "nad", "metric_name": "vm`memory`used", "name": "Memory Used"},
		{ "bundle": "nad", "metric_name": "vm`swap`free", "name": "Swap Free"},
		{ "bundle": "nad", "metric_name": "vm`swap`used", "name": "Swap Used"}
	    ]
	},
	{
	    "title": "Disks - ",
	    "datapoints": [
		{ "bundle": "nad", "metric_name": "disk`loop0`nread", "name": "Disk Nread"},
		{ "bundle": "nad", "metric_name": "disk`loop0`nwritten", "name": "Disk Nwritten"},
		{ "bundle": "nad", "metric_name": "disk`loop0`reads", "name": "Disk Reads"},
		{ "bundle": "nad", "metric_name": "disk`loop0`writes", "name": "Disk Writes"}
	   ]
	},
	{
	    "title": "Network - ",
	    "datapoints": [
		{ "bundle": "nad", "metric_name": "if`eth0`in_bytes", "name": "Ethernet In Bytes"},
		{ "bundle": "nad", "metric_name": "if`eth0`in_errors", "name": "Ethernet In Errors"},
		{ "bundle": "nad", "metric_name": "if`eth0`out_bytes", "name": "Ethernet Out Bytes"},
		{ "bundle": "nad", "metric_name": "if`eth0`out_errors", "name": "Ethernet Out Errors"}
            ]
	}
	


    ];

    this.scripts = [
        { "prefix": "cpu", "filename": "cpu.sh" },
        { "prefix": "disk", "filename": "disk.sh" },
        { "prefix": "fs", "filename": "fs.elf" },
        { "prefix": "if", "filename": "if.sh" },
        { "prefix": "vm", "filename": "vm.sh" }
    ];

    this.initialize = function(callback) {
        this.availableCheckBundles = {"nad": { "metrics": [] }};

        async.series([
            this.super.initialize.bind(this),
            this.getNadPath.bind(this),
            this.getMetricsFromScriptOutput.bind(this)
        ], callback);
    };

    this.getNadPath = function(callback) {
        var self = this;
        var nadConfig = self.componentConfig();

        nadConfig.path = nadConfig.path || "/opt/circonus";

        if(!fs.existsSync(nadConfig.path) || !fs.existsSync(path.join(nadConfig.path, "sbin", "nad"))) {
            var prompttext = util.format("Node.js Agent not found at %s.\n" +
                                         "If nad is not installed, please visit %s and download the correct package for your platform.\n" +
                                         "If nad is installed in another location, enter that location.",
                                         nadConfig.path, nadURL)

            interrogator.question({"description": prompttext, "type": interrogator.filepath, "required": true}, function(err, answer) {
                nadConfig.path = answer;
                return callback(err);
            });
        }

        return callback(null);
    };

    this.getMetricsFromScriptOutput = function(callback) {
        var self = this;
        var bundle = self.availableCheckBundles.nad;
        var nadConfig = self.componentConfig();

        async.each(this.scripts, function(script, callback) {
            var scriptPath = path.join(nadConfig.path, "etc", "node-agent.d", script.filename);
            var proc = child_process.spawn(scriptPath);
            script.buffer = "";

            proc.stdout.on('data', function(data) {
                script.buffer = script.buffer + data;
                var lines = script.buffer.split(/\r?\n/);
                script.buffer = lines.pop();

                lines.forEach(function(line) {
                    var lineVars = line.split(/\s+/);
                    bundle.metrics.push(script.prefix + "`" + lineVars[0]);
                });
            });

            proc.stdout.on('close', function(code) {
                if(code != 0) {
                    return callback(util.format("%s exited with status %s", scriptPath, code));
                }

                return callback();
            });

            proc.stdin.end();
        }, callback);
    };

    this.getBundleConfig = function(bundle) {
        return { "url": url.format({"protocol": "http", "hostname": this.config.target}), "port": 2609 };
    };
};

