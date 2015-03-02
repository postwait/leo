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
    this.checkIDs = {};

    // Default functions, can be overridden as necessary
    this.initialize = this.getMetricsFromScriptOutput;
    this.main = this.addEnabledMetrics;

    require(fullPath).bind(this)();
}

Component.prototype.logdebug = function() {
    args = arguments;
    args[0] = sprintf(" * <%s> %s", this.name, args[0]);
    this.config.logdebug.apply(this.config, args);
};

Component.prototype.addMetric = function(metricName, metricType) {
    metricType = metricType || "numeric";

    this.config.metrics.push({ "name": metricName, "type": metricType, "status": "active" });
};

Component.prototype.addGraph = function(graph) {
    this.config.graphs = this.config.graphs || [];

    this.config.graphs.push(graph);
};

Component.prototype.getMetricsFromScriptOutput = function(callback) {
    var scriptPath = path.join(this.config.nadpath, "etc", "node-agent.d", this.nadScriptFilename);
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

    if(this.config.alldefault) {
        if(!this.config.configread) {
            tasks.push(this.addDefaultGraphs.bind(this));
        }
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
        rl.close();
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

Component.prototype.apiCalls = function(callback) {
    var tasks = [
        this.addCheckBundles.bind(this),
        this.addGraphs.bind(this)
    ];

    async.series(tasks, function(err) {
        return callback(err);
    });
};

Component.prototype.addCheckBundles = function(callback) {
    var self = this;
    var tasks = [];

    if(!self.availableCheckBundles) {
        return callback(null);
    }

    for(bundleName in self.availableCheckBundles) {
        var bundle = self.availableCheckBundles[bundleName];
        var metricsData = [];
        for(i in bundle.metrics) {
            if(self.enabledMetrics.indexOf(bundleName + "`" + bundle.metrics[i]) > -1) {
                metricsData.push({"name": bundle.metrics[i], "type": "numeric"});
            }
        }

        if(metricsData.length > 0) {
            var checkBundleData = {
                "brokers": [ "/broker/" + self.config.brokerid ],
                "config": self.getBundleConfig(bundle),
                "metrics": metricsData,
                "period": 60,
                "status": "active",
                "target": self.config.target,
                "timeout": 10,
                "type": self.name
            };

            tasks.push(function(callback) {
                self.config.api.post("/check_bundle", checkBundleData, function(code, err, body) {
                    if(err) {
                        console.error("Couldn't add check bundle for component %s: %s", self.name, err);
                        return callback(err);
                    }

                    self.checkIDs[bundleName] = body._checks[0].replace("/check/", "");
                    return callback(err);
                });
            });
        }
    }

    async.parallel(tasks, function(err) {
        return callback(err);
    });
};

Component.prototype.addGraphs = function(callback) {
    var self = this;

    if(!self.defaultGraphs) {
        return callback(null);
    }

    async.each(self.defaultGraphs, function(graph, callback) {
        var graphData = {
            "title": graph["title"],
            "datapoints": []
        };

        graph.datapoints.forEach(function(datapoint) {
            graphData.datapoints.push({
                "axis": "l",
                "check_id": self.checkIDs[datapoint.bundle],
                "color": datapoint.color || "#4f4f9f",
                "data_formula": null,
                "derive": "gauge",
                "hidden": false,
                "legend_formula": null,
                "metric_name": datapoint.metric_name,
                "metric_type": "numeric",
                "name": datapoint.name || datapoint.metric_name,
                "stack": null
            });
        });

        self.config.api.post("/graph", graphData, function(code, err, body) {
            if(err) {
                console.error("Error adding graph: %s", err);
                return callback(err);
            }

            self.config.graphIDs.push(body._cid);
            return callback();
        });
    }, function(err, tasks) {
        return callback(err);
    });
};

Component.prototype.componentConfig = function(callback) {
    this.config.components[this.name] = this.config.components[this.name] || {};
    return this.config.components[this.name];
}

module.exports = Component;
