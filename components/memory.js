var path = require('path');

module.exports = function Memory() {
    this.initialize = function(callback) {
        var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", "vm.sh");
        this.getMetricsFromScriptOutput(scriptPath, callback);
    };

    this.main = function(callback) {
        this.metricNames.forEach(function(metricName) {
            this.addMetric("vm`" + metricName);
        }.bind(this));

        return callback();
    }
};
