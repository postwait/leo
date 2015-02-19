var path = require('path');

module.exports = function Disk() {
    this.initialize = function(callback) {
        var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", "disk.sh");
        this.getMetricsFromScriptOutput(scriptPath, callback);
    };

    this.main = function(callback) {
        this.metricNames.forEach(function(metricName) {
            this.addMetric("disk`" + metricName);
        }.bind(this));

        return callback();
    }
};
