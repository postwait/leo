var path = require('path');

module.exports = function CPU() {
    this.nadScriptFilename = "cpu.sh";
    this.metricPrefix = "cpu";

    this.defaultMetrics = ["kernel", "user"];
    this.defaultGraphs = [
        {
            "title": "CPU Usage",
            "datapoints": [
                { "metric_name": "cpu`kernel", "name": "Kernel" },
                { "metric_name": "cpu`user",   "name": "User" }
            ]
        }
    ];
};
