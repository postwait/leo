var async = require('async');
var heredoc = require('heredoc');
var util = require('util');

module.exports = function Postgres() {
    this.checkType = "postgres";
    this.displayname = "PostgreSQL";
    this.description = "PostgreSQL database metrics";

    this.defaultMetrics = {
        "connections": ["connections", "total_used"]
    };

    this.defaultGraphs = [
        {
            "title": "PostgreSQL Connections",
            "datapoints": [
                { "bundle": "connections", "metric_name": "connections", "name": "Connections" }
            ]
        }
    ];

    this.availableCheckBundles = {
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

    this.customPrompts = function(callback) {
        var self = this;
        var pgConfig = self.componentConfig();

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

        self.config.interrogator.updateObject(pgConfig, prompts, function(err) {
            var stringParts = [];
            for(i in pgConfig) {
                stringParts.push(util.format("%s=%s", i, pgConfig[i]));
            }

            self.connectionString = stringParts.join(" ");

            return callback(err);
        });
    };

    this.getBundleConfig = function(bundle) {
        return {
            "dsn": this.connectionString,
            "sql": bundle.sql
        }
    };
};
