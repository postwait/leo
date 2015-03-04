var async = require('async');
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
    this.enabledMetrics = [];
    this.checkIDs = {};
    this.graphIDs = [];
    this.availableCheckBundles = {};

    // Default functions, can be overridden as necessary
    this.main = this.addEnabledMetrics;

    require(fullPath).bind(this)();
}

Component.prototype.logdebug = function() {
    args = arguments;
    args[0] = sprintf(" * <%s> %s", this.name, args[0]);
    this.config.logdebug.apply(this.config, args);
};

Component.prototype.initialize = function(callback) {
    this.enabledMetrics = this.defaultMetrics;
    return callback();
};

Component.prototype.addMetric = function(metricName, metricType) {
    metricType = metricType || "numeric";

    this.config.metrics.push({ "name": metricName, "type": metricType, "status": "active" });
};

Component.prototype.addGraph = function(graph) {
    this.config.graphs = this.config.graphs || [];

    this.config.graphs.push(graph);
};

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
    var self = this;
    var tasks = [];

    var bundles = [];
    for(bundle in self.availableCheckBundles) {
        bundles.push(bundle);
    }

    async.each(bundles, function(bundle, callback) {
        self.availableCheckBundles[bundle].metrics.sort();

        var question = {
            "description": sprintf("Enabled metrics for %s:", self.availableCheckBundles[bundle].description || bundle),
            "options": self.availableCheckBundles[bundle].metrics,
            "defaults": self.enabledMetrics
        };

        self.config.interrogator.multiSelect(question, function(err, metricsSelected) {
            self.availableCheckBundles[bundle].metrics.forEach(function(metric, index) {
                metric.enabled = metricsSelected[index];
            });

            return callback();
        });
    }, callback);
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

    var bundles = [];
    for(name in self.availableCheckBundles) {
        bundles.push({ "name": name, "bundle": self.availableCheckBundles[name] });
    }

    async.each(bundles, function(item, callback) {
        var bundleName = item.name;
        var bundle = item.bundle;

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
                "type": self.checkType
            };

            self.config.api.post("/check_bundle", checkBundleData, function(code, err, body) {
                if(err) {
                    console.error("Couldn't add check bundle for component %s: %s", self.name, err);
                    return callback(err);
                }

                self.checkIDs[bundleName] = body._checks[0].replace("/check/", "");

                console.info("Created check bundle %s for component %s.", self.checkIDs[bundleName], self.name);
                return callback(err);
            });
        }

        return callback(null);
    }, callback);
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

            self.graphIDs.push(body._cid);
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
