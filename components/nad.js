var async = require('async');
var child_process = require('child_process');
var path = require('path');
var url = require('url');

module.exports = function Nad() {
    this.checkType = "json";
    this.isDefault = true;
    this.description = "CPU, disk, memory, and network metrics via Node.js Agent";

    this.defaultMetrics = ["cpu`kernel", "cpu`user"];
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
        var self = this;
        self.availableCheckBundles = {"nad": { "metrics": [] }};
        var bundle = self.availableCheckBundles.nad;

        self.enabledMetrics = self.defaultMetrics;

        async.each(this.scripts, function(script, callback) {
            var scriptPath = path.join(self.config.nadpath, "etc", "node-agent.d", script.filename);
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

