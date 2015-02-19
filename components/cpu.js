var path = require('path');

module.exports = function CPU() {
    this.initialize = function(callback) {
        var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", "cpu.sh");
        this.addMetricsFromScriptOutput(scriptPath, callback);

    };

    this.main = function(callback) {
        this.metricNames.forEach(function(metricName) {
            this.addMetric("cpu`" + metricName);
        }.bind(this));

        return callback();
    }
};
