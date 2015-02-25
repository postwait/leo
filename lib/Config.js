var async = require('async');
var fs = require('fs');
var jsonfile = require('jsonfile');
var minimist = require('minimist');

// Configuration options that are saved in config file
var CONFIG_KEYS_FILE = [
    "target",
    "authtoken",
    "brokerid",
    "nadpath",
    "alldefault",
    "metrics",
    "graphs"
];

// All other config options (config filename, help, etc.)
var CONFIG_KEYS_OTHER = [
    "help",
    "configfile"
];

var CONFIG_KEYS = CONFIG_KEYS_FILE.concat(CONFIG_KEYS_OTHER);

function Config() {
}

Config.prototype.readCommandLine = function() {
    var config = minimist(process.argv.slice(2), {
        alias: {
            "help": "h",
            "target": "t",
            "authtoken": ["k", "auth-token", "auth_token"],
            "brokerid": ["b", "broker-id", "broker_id"],
            "nadpath": ["nad-path", "nad_path"],
            "alldefault": ["all-default", "all_default", "alldefaults", "all-defaults", "all_defaults"],
            "configfile": ["c", "config-file", "config_file"]
        }
    });

    this.merge(config);
};

Config.prototype.readFromFile = function(callback) {
    if(!this.configfile) {
        return callback();
    }

    fs.exists(this.configfile, function(exists) {
        if(!exists) {
            console.info("Config file %s does not exist. Ignoring.", this.configfile);
            return callback();
        }

        jsonfile.readFile(this.configfile, function(err, fileConfig) {
            if(err) {
                console.error("Couldn't read config file: %s", err);
                callback(err);
            }

            this.configread = true;
            this.merge(fileConfig);

            this.graphs = this.graphs || [];
            this.metrics = this.metrics || [];

            return callback();
        }.bind(this));
    }.bind(this));
};

Config.prototype.writeToFile = function(callback) {
    var savedConfig = {};

    CONFIG_KEYS_FILE.forEach(function(key) {
        savedConfig[key] = this[key];
    }.bind(this));

    jsonfile.writeFile(this.configfile, savedConfig, function(err) {
        if(err) {
            console.error("Couldn't write config to %s: %s", this.configfile, err);
            return callback(err);
        }

        console.info("Wrote config to %s.", this.configfile);
        return callback();
    }.bind(this));
};

Config.prototype.merge = function(opts) {
    CONFIG_KEYS.forEach(function(k) {
        this[k] = this[k] || opts[k];
    }.bind(this));
};

module.exports = Config;
