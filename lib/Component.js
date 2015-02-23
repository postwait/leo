var async = require('async');
var child_process = require('child_process');
var path = require('path');
var readline = require('readline');
var sprintf = require('sprintf');
var util = require('util');

function Component(fullPath) {
    this.name = path.basename(fullPath).replace('.js', '');
    this.config = {};
    this.metrics = [];
    this.graphs = [];
    this.defaultMetrics = [];
    this.defaultGraphs = [];

    // Default functions, can be overridden as necessary
    this.initialize = this.getMetricsFromScriptOutput;
    this.main = this.addEnabledMetrics;

    require(fullPath).bind(this)();
}

Component.prototype.addMetric = function(metricName, metricType) {
    metricType = metricType || "numeric";

    this.configData.metrics.push({ "name": metricName, "type": metricType, "status": "active" });
};

Component.prototype.addGraph = function(graph) {
    this.configData.graphs = this.configData.graphs || [];

    this.configData.graphs.push(graph);
};

Component.prototype.getMetricsFromScriptOutput = function(callback) {
    var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", this.nadScriptFilename);
    var script = child_process.spawn(scriptPath);
    this.buffer = "";

    script.stdout.on('data', function(data) {
        this.buffer = this.buffer + data;
        var lines = this.buffer.split(/\r?\n/);
        this.buffer = lines.pop();

        lines.forEach(function(line) {
            var lineVars = line.split(/\s+/);
            var isEnabled = this.defaultMetrics.indexOf(lineVars[0]) > -1 ? true : false;

            this.metrics.push({"name": lineVars[0], "type": "numeric", "enabled": isEnabled});
        }.bind(this));
    }.bind(this));

    script.stdout.on('close', function(code) {
        if(code != 0) {
            return callback(util.format("%s exited with status %s", scriptPath, code));
        }

        return callback();
    }.bind(this));

    script.stdin.end();
};

Component.prototype.printMetrics = function() {
    console.info("%s metrics:", this.name);
    this.metrics.forEach(function(metric, idx) {
        console.info(sprintf("  %3d. [%s] %s", idx+1, metric.enabled ? "*" : " ", metric.name));
    });
    console.info("");
}

Component.prototype.prompts = function(callback) {
    var tasks = [];

    if(this.userConfig.alldefault) {
        tasks.push(this.addDefaultGraphs.bind(this));
    }
    else {
        tasks.push(this.promptEnabledMetrics.bind(this));
        tasks.push(this.promptDefaultGraphs.bind(this));
    }

    async.series(tasks, function(err) {
        return callback(err);
    });
};

Component.prototype.promptEnabledMetrics = function(callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    this.metrics.sort(function(a, b) { return a.name.localeCompare(b.name) });
    this.printMetrics();

    var done = false;
    async.until(function() { return done; }, function(callback) {
        console.info('Enter a number to enable/disable a metric, "l" to list metrics again, or "q" to quit:');
        rl.question(' [q] > ', function(answer) {
            answer = answer.replace(/ /g, '').toLowerCase();

            if(answer == "" || answer == "q") {
                done = true;
            }
            else if(answer == "l") {
                this.printMetrics();
            }
            else if(!isNaN(answer)) {
                var metric = this.metrics[parseInt(answer)-1];
                metric.enabled = !metric.enabled;
                console.info(" * %s metric %s.", metric.enabled ? "Enabled" : "Disabled", metric.name);
            }

            return callback();
        }.bind(this), callback);
    }.bind(this), function(err) {
        rl.close();
        return callback(err);
    });
};

Component.prototype.promptDefaultGraphs = function(callback) {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.info('Would you like to create the default graphs for this component?');
    rl.question(' [Y/n] > ', function(answer) {
        answer = answer.replace(/ /g, '').toLowerCase();
        if(answer == "" || answer.indexOf("y") == 0) {
            return this.addDefaultGraphs(callback);
        }

        return callback();
    }.bind(this));
};

Component.prototype.addDefaultGraphs = function(callback) {
    this.defaultGraphs.forEach(this.addGraph.bind(this));
    return callback();
};

Component.prototype.addEnabledMetrics = function(callback) {
    this.metrics.forEach(function(metric) {
        if(metric.enabled) {
            this.addMetric(this.metricPrefix + "`" + metric.name, metric.type);
        }
    }.bind(this));

    return callback();
}

module.exports = Component;