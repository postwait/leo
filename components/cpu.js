var spawn = require('child_process').spawn;
var path = require('path');
var util = require('util');

module.exports = function CPU() {
    this.initialize = function(callback) {
        var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", "cpu.sh");
        var script = spawn(scriptPath);
        this.buffer = "";
        this.metricNames = [];

        script.stdout.on('data', function(data) {
            this.buffer = this.buffer + data;
            var lines = this.buffer.split(/\r?\n/);
            this.buffer = lines.pop();

            lines.forEach(function(line) {
                var lineVars = line.split(/\s+/);
                this.metricNames.push(lineVars[0]);
            }.bind(this));
        }.bind(this));

        script.stdout.on('close', function(code) {
            if(code != 0) {
                return callback(util.format("%s exited with status %s", scriptPath, code));
            }

            return callback();
        });

        script.stdin.end();
    };

    this.main = function(callback) {
        this.metricNames.forEach(function(metricName) {
            this.addMetric("cpu`" + metricName);
        }.bind(this));

        return callback();
    }
};
