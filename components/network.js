var path = require('path');

module.exports = function Network() {
    this.initialize = function(callback) {
        var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", "if.sh");
        this.getMetricsFromScriptOutput(scriptPath, callback);
    };

    this.main = function(callback) {
        this.metricNames.forEach(function(metricName) {
            this.addMetric("if`" + metricName);
        }.bind(this));

        return callback();
    }
};
