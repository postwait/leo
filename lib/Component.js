var path = require('path');

function Component(fullPath) {
    this.name = path.basename(fullPath).replace('.js', '');
    this.config = {};

    require(fullPath).bind(this)();
}

Component.prototype.addMetric = function(metricName, metricType) {
    metricType = metricType || "numeric";

    this.configData.check = this.configData.check || {};
    this.configData.check.metrics = this.configData.check.metrics || {};
    this.configData.check.metrics[metricType] = this.configData.check.metrics[metricType] || [];

    this.configData.check.metrics[metricType].push(metricName);
};

Component.prototype.addGraph = function(graphName, graphConfig) {
    this.configData.graphs = this.configData.graphs || {};

    this.configData.graphs[graphName] = graphConfig;
};

module.exports = Component;