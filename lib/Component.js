var path = require('path');

function Component(fullPath) {
    this.name = path.basename(fullPath).replace('.js', '');
    this.config = {};

    require(fullPath).bind(this)();
}

Component.prototype.addMetric = function(metricName, metricType) {
    metricType = metricType || "numeric";

    this.configData.metrics.push({ "name": metricName, "type": metricType, "status": "active" });
};

Component.prototype.addGraph = function(graphName, graphConfig) {
    this.configData.graphs = this.configData.graphs || {};

    this.configData.graphs[graphName] = graphConfig;
};

module.exports = Component;