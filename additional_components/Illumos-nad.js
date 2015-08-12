var async = require('async');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var url = require('url');

var nadURL = "http://updates.circonus.net/node-agent/packages/";

module.exports = function Nad() {
    this.checkType = "json";
    this.displayname = "Node.js Agent";
    this.description = "CPU, disk, memory, and network metrics via Node.js Agent for Illumos";

    this.defaultMetrics = {
        "nad": ["cpu`idle`steal", "cpu`kernel", "cpu`user", "cpu`wait_io", "sdinfo`sd:0:sd0:nread", "sdinfo`sd:0:sd0:nwritten", "sdinfo`sd:0:sd0:reads", "sdinfo`sd:0:sd0:writes", "if`link:0:net0:ierrors", "if`link:0:net0:obytes", "if`link:0:net0:oerrors", "vminfo`unix:0:vminfo:fremem", "vminfo`unix:0:vminfo:swap_free", "vminfo`unix:0:vminfo:swap_alloc", "zfs`/`used_percent"]
    };

    this.defaultGraphs = [
        {
            "title": "CPU - ",
            "datapoints": [
                { "bundle": "nad", "metric_name": "cpu`idle`steal", "derive": "counter", "name": "Idle Steal"},
                { "bundle": "nad", "metric_name": "cpu`kernel", "derive": "counter", "name": "Kernel" },
                { "bundle": "nad", "metric_name": "cpu`user", "derive": "counter", "name": "User" },
                { "bundle": "nad", "metric_name": "cpu`wait_io", "derive": "counter", "name": "I/O Wait"},
            ]
        },
        {
            "title": "Memory - ",
            "datapoints": [
                { "bundle": "nad", "metric_name": "vminfo`unix:0:vminfo:fremem", "derive": "counter", "data_formula": "=VAL*4096", "name": "Memory Free"},
                { "bundle": "nad", "metric_name": "vminfo`unix:0:vminfo:swap_free", "name": "Swap Free"},
                { "bundle": "nad", "metric_name": "vminfo`unix:0:vminfo:swap_alloc", "name": "Swap Used"}
            ]
        },
		
{
            "title": "Disks - ",
            "datapoints": [
                { "bundle": "nad", "metric_name": "sdinfo`sd:0:sd0:nread", "name": "Disk Nread"},
                { "bundle": "nad", "metric_name": "sdinfo`sd:0:sd0:nwritten", "name": "Disk Nwritten"},
                { "bundle": "nad", "metric_name": "sdinfo`sd:0:sd0:reads", "name": "Disk Reads"},
                { "bundle": "nad", "metric_name": "sdinfo`sd:0:sd0:writes", "name": "Disk Writes"}
           ]
        },
        {
            "title": "Network - ",
            "datapoints": [
                { "bundle": "nad", "metric_name": "if`link:0:net0:ierrors", "derive": "counter", "name": "Ethernet In Errors"},
                { "bundle": "nad", "metric_name": "if`link:0:net0:obytes", "derive": "counter", "name": "Ethernet Out Bytes"},
                { "bundle": "nad", "metric_name": "if`link:0:net0:oerrors", "derive": "counter", "name": "Ethernet Out Errors"}
            ]
        },
        {
            "title": "File Systems -",
            "datapoints": [
                { "bundle": "nad", "metric_name": "zfs`/`used_percent", "name": "Fs '/' Used Percent"},
            ]
        }
    ];

    this.scripts = [
        { "prefix": "cpu", "filename": "cpu.elf" },
        { "prefix": "sdinfo", "filename": "sdinfo.sh" },
        { "prefix": "fs", "filename": "fs.elf" },
        { "prefix": "if", "filename": "if.sh" },
        { "prefix": "vminfo", "filename": "vminfo.sh" }
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

