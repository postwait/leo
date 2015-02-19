var path = require('path');
var child_process = require('child_process');
var util = require('util');

function Component(fullPath) {
    this.name = path.basename(fullPath).replace('.js', '');
    this.config = {};
    this.metricNames = [];
    this.graphs = [];

    require(fullPath).bind(this)();
}

Component.prototype.addMetric = function(metricName, metricType) {
    metricType = metricType || "numeric";

    this.configData.metrics.push({ "name": metricName, "type": metricType, "status": "active" });
};

Component.prototype.addGraph = function(graphName, graphConfig) {
    this.configData.graphs = this.configData.graphs || {};

    this.configData.graphs[graphName] = graphConfig;
};

Component.prototype.getMetricsFromScriptOutput = function(scriptPath, callback) {
    var script = child_process.spawn(scriptPath);
    this.buffer = "";

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

module.exports = Component;