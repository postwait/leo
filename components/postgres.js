var async = require('async');
var heredoc = require('heredoc');
var util = require('util');

module.exports = function Postgres() {
    this.checkType = "postgres";
    this.displayname = "PostgreSQL";
    this.description = "PostgreSQL database metrics";

    this.defaultMetrics = {};
    this.defaultGraphs = [];
    this.availableCheckBundles = {};

    this.defaultGraphsForDatabase = [
        {
            "title": "PostgreSQL Connections",
            "datapoints": [
                { "bundle": "connections", "metric_name": "connections", "name": "Connections" }
            ]
        }
    ];

    this.availableQueries = {
        "connections": {
            "metrics": ["connections", "max_connections", "total_used", "pct_used", "idle", "idle_in_txn", "active", "max_idle_in_txn"],
            "defaultMetrics": ["connections", "total_used"],
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

    this.initialize = function(callback) {
        async.series([
            this.super.initialize.bind(this),
            this.loadPgModule.bind(this)
        ], callback);
    };

    this.loadPgModule = function(callback) {
        this.pg = require('pg');
        return callback();
    };

    this.customPrompts = this.promptConnectionInfo = function(callback) {
        var self = this;
        var pgConfig = self.componentConfig();

        var prompts = [
            {
                "name": "host",
                "description": util.format("Please enter the hostname that Circonus will use to connect to your database. [default: %s]", self.config.target),
                "default": this.config.target
            },
            {
                "name": "user",
                "description": "Please enter the username of the Postgres account that Circonus will use to connect to your database. [default: circonus]",
                "default": "circonus"
            },
            {
                "name": "password",
                "description": "Please enter the password for user \"%s\".",
                "descriptionFormatter": function(s) { return util.format(s, pgConfig.user); },
                "error": "A password is required.",
                "silent": true,
                "required": true
            },
            {
                "name": "dbname",
                "description": "Please enter the name of any database that this user can connect to. [default: postgres]",
                "default": "postgres"
            }
        ];

        self.config.interrogator.updateObject(pgConfig, prompts, function(err) {
            if(err) return callback(err);
            self.promptEnabledDatabases.call(self, callback);
        });
    };

    this.promptEnabledDatabases = function(callback) {
        var self = this;
        var pgConfig = self.componentConfig();
        var connString = util.format("postgres://%s:%s@%s/%s", pgConfig.user, pgConfig.password, pgConfig.host, pgConfig.dbname);

        self.pg.connect(connString, function(err, client, done) {
            if(err) {
                console.error("Couldn't connect to database %s/%s with username \"%s\".", pgConfig.host, pgConfig.dbname, pgConfig.user);
                console.error("Error from the client was: %s", err);

                for(i in pgConfig) {
                    delete pgConfig[i];
                }

                return self.promptConnectionInfo(callback);
            }

            client.query("SELECT datname FROM pg_database WHERE datistemplate = false", function(err, result) {
                done();
                if(err) {
                    console.error("Couldn't query pg_database with username \"%s\".", pgConfig.user);
                    console.error("Error from the client was: %s", err);

                    for(i in pgConfig) {
                        delete pgConfig[i];
                    }

                    client.end();
                    return self.promptConnectionInfo(callback);
                }

                pgConfig.dbNames = result.rows.map(function(val) { return val.datname });
                client.end();

                var question = {
                    "description": "Which databases would you like to configure checks for?",
                    "options": pgConfig.dbNames
                }

                self.config.interrogator.multiSelect(question, function(err, databasesSelected) {
                    if(err) return callback(err);

                    for(var i in databasesSelected) {
                        var dbname = pgConfig.dbNames[i];

                        for(queryName in self.availableQueries) {
                            var bundle = self.availableCheckBundles[dbname + "`" + queryName] = util._extend({}, self.availableQueries[queryName]);
                            bundle.dbname = dbname;
                            bundle.description = util.format('%s on database "%s"', bundle.description || queryName, dbname);

                            var defaultMetrics = self.defaultMetrics[dbname + "`" + queryName] = bundle.defaultMetrics;
                        }

                        self.defaultGraphsForDatabase.forEach(function(graph) {
                            var dbGraph = util._extend({}, graph);
                            dbGraph.datapoints.forEach(function(datapoint) {
                                datapoint.bundle = dbname + "`" + datapoint.bundle;
                            });

                            self.defaultGraphs.push(dbGraph);
                        });
                    }

                    return callback();
                });
            });
        });
    };

    this.getBundleConfig = function(bundle) {
        var stringParts = [util.format("dbname=%s", bundle.dbname)];
        var pgConfig = this.componentConfig();

        for(i in pgConfig) {
            stringParts.push(util.format("%s=%s", i, pgConfig[i]));
        }

        var connectionString = stringParts.join(" ");

        return {
            "dsn": connectionString,
            "sql": bundle.sql
        }
    };
};
