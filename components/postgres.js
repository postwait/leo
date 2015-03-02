var async = require('async');
var heredoc = require('heredoc');
var util = require('util');

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
        var self = this;
        var pgConfig = self.componentConfig();

        if(self.config.alldefault && pgConfig.host && pgConfig.user && pgConfig.password && pgConfig.dbname) {
            return callback();
        }

        var prompts = [
            {
                "name": "host",
                "description": util.format("Please enter the hostname that Circonus will use to connect to your database [default: %s]", self.config.target),
                "default": this.config.target
            },
            {
                "name": "user",
                "description": "Please enter the username of the Postgres account that Circonus will use to connect to your database.",
                "error": "A username is required.",
                "required": true
            },
            {
                "name": "password",
                "description": "Please enter the password for the Postgres account.",
                "error": "A password is required.",
                "silent": true,
                "required": true
            },
            {
                "name": "dbname",
                "description": "Please enter the name of the Postgres database.",
                "error": "A database name is required.",
                "required": true
            }
        ];

        self.config.interrogator.updateObject(self.config.components.postgres, prompts, function(err) {
            var stringParts = [];
            for(i in self.componentConfig()) {
                stringParts.push(util.format("%s=%s", i, self.componentConfig()[i]));
            }

            self.connectionString = stringParts.join(" ");

            return callback(err);
        });
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
