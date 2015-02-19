var path = require('path');

module.exports = function FS() {
    this.initialize = function(callback) {
        var scriptPath = path.join(this.userConfig.nadpath, "etc", "node-agent.d", "fs.elf");
        this.getMetricsFromScriptOutput(scriptPath, callback);
    };

    this.main = function(callback) {
        this.metricNames.forEach(function(metricName) {
            this.addMetric("fs`" + metricName);
        }.bind(this));

        return callback();
    }
};
