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

    this.defaultMetrics = ["nad`cpu`kernel", "nad`cpu`user"];
    this.defaultGraphs = [
        {
            "title": "CPU Usage",
            "datapoints": [
                { "bundle": "nad", "metric_name": "cpu`kernel", "name": "Kernel" },
                { "bundle": "nad", "metric_name": "cpu`user",   "name": "User" }
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
        this.enabledMetrics = this.componentConfig().enabledMetrics || this.defaultMetrics;

        async.series([
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

