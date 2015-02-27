var async = require('async');
var heredoc = require('heredoc');

var availableCheckBundles = {
    "connections": {
        "metrics": ["connections", "max_connections", "total_used", "pct_used", "idle", "idle_in_txn", "active", "max_idle_in_txn"],
        "sql": heredoc(function() {/*
          select 'connections', max_connections, total_used, coalesce(round(100*(total_used/max_connections)),0) as pct_used,
            idle, idle_in_txn, ((total_used - idle) - idle_in_txn) as active,
            (select coalesce(extract(epoch from (max(now() - query_start))),0) from pg_stat_activity where current_query = '<IDLE> in transaction') as max_idle_in_txn
          from (select count(*) as total_used, coalesce(sum(case when current_query = '<IDLE>' then 1 else 0 end),0) as idle,
            coalesce(sum(case when current_query = '<IDLE> in transaction' then 1 else 0 end),0) as idle_in_txn from pg_stat_activity) x
            join (select setting::float AS max_connections FROM pg_settings WHERE name = 'max_connections') xx ON (true);"
                                   */})
    }
};

module.exports = function Postgres() {
    this.defaultMetrics = ["connections`connections", "connections`total_used"];
    this.defaultGraphs = [
        {
            "title": "PostgreSQL Connections",
            "datapoints": [
                { "metric_name": "postgres`connections", "name": "Connections" }
            ]
        }
    ];
    this.checkIDs = [];
    this.databases = [];

    this.initialize = function(callback) {
        this.enabledMetrics = this.defaultMetrics;
        return callback();
    };

    this.addEnabledMetrics = function(callback) {
        return callback();
    };

    this.prompts = function(callback) {
        //todo
        this.connectionString = "host=nad-1.kingofnopants.net user=circonus password=circonus dbname=postgres";
        return callback();
    };

    this.apiCalls = function(callback) {
        var self = this;
        var tasks = [];

        for(bundleName in availableCheckBundles) {
            var bundle = availableCheckBundles[bundleName];
            var metricsData = [];
            for(i in bundle.metrics) {
                if(self.enabledMetrics.indexOf(bundleName + "`" + bundle.metrics[i]) > -1) {
                    metricsData.push({"name": bundle.metrics[i], "type": "numeric"});
                }
            }

            if(metricsData.length > 0) {
                var checkBundleData = {
                    "brokers": [ "/broker/" + self.config.brokerid ],
                    "config": {
                        "dsn": self.connectionString,
                        "sql": bundle.sql
                    },
                    "metrics": metricsData,
                    "period": 60,
                    "status": "active",
                    "target": self.config.target,
                    "timeout": 10,
                    "type": "postgres"
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
};
