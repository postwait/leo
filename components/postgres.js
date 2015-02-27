var async = require('async');
var heredoc = require('heredoc');

var availableMetrics = {
    "connections": heredoc(function() {/*
       select 'connections', max_connections, total_used, coalesce(round(100*(total_used/max_connections)),0) as pct_used,
         idle, idle_in_txn, ((total_used - idle) - idle_in_txn) as active,
         (select coalesce(extract(epoch from (max(now() - query_start))),0) from pg_stat_activity where current_query = '<IDLE> in transaction') as max_idle_in_txn
       from (select count(*) as total_used, coalesce(sum(case when current_query = '<IDLE>' then 1 else 0 end),0) as idle,
         coalesce(sum(case when current_query = '<IDLE> in transaction' then 1 else 0 end),0) as idle_in_txn from pg_stat_activity) x
         join (select setting::float AS max_connections FROM pg_settings WHERE name = 'max_connections') xx ON (true);"
                                       */})
};

module.exports = function Postgres() {
    this.defaultMetrics = ["connections", "tables"];
    this.defaultGraphs = [
        {
            "title": "PostgreSQL Connections",
            "datapoints": [
                { "metric_name": "postgres`connections", "name": "Connections" }
            ]
        }
    ];
    this.checkIDs = [];

    this.initialize = function(callback) {
        for(metricName in availableMetrics) {
            var isEnabled = this.defaultMetrics.indexOf(metricName) > -1 ? true : false;
            this.metrics.push({"name": metricName, "type": "numeric", "enabled": isEnabled});
        }

        return callback();
    };

    this.addEnabledMetrics = function(callback) {
        return callback();
    };

    this.prompts = function(callback) {
        //todo
        this.connectionString = "host=nad-1.kingofnopants.net,dbname=postgres,user=circonus,password=circonus";
        return callback();
    };

    this.apiCalls = function(callback) {
        var tasks = [];

        this.metrics.forEach(function(metric) {
            if(!metric.enabled) {
                return;
            }

            var checkBundleData = {
                "brokers": [ "/broker/" + this.config.brokerid ],
                "config": {
                    "dsn": this.connectionString,
                    "sql": availableMetrics[metric.name]
                },
                "metrics": [ {"name": metric.name, "type": "numeric"} ],
                "period": 60,
                "status": "active",
                "target": this.config.target,
                "timeout": 10,
                "type": "postgres"
            };

            tasks.push(function(callback) {
                this.config.api.post("/check_bundle", checkBundleData, function(code, err, body) {
                    if(err) {
                        console.error("Couldn't add check bundle for component %s: %s", this.name, err);
                        return callback(err);
                    }

                    this.checkIDs[metric.name] = body._checks[0].replace("/check/", "");
                    return callback(err);
                }.bind(this));
            }.bind(this));
        }.bind(this));

        async.parallel(tasks, function(err) {
            return callback(err);
        });
    };
};
