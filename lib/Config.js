var async = require('async');
var fs = require('fs');
var jsonfile = require('jsonfile');
var minimist = require('minimist');
var moment = require('moment');
var sprintf = require('sprintf');

// Configuration options that are saved in config file
var CONFIG_KEYS_FILE = [
    "target",
    "authtoken",
    "brokerid",
    "nadpath",
    "alldefault",
    "metrics",
    "graphs",
    "components"
];

// All other config options (config filename, help, etc.)
var CONFIG_KEYS_OTHER = [
    "help",
    "configfile",
    "debug"
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
            "configfile": ["c", "config-file", "config_file"],
            "debug": "d",
        }
    });

    this.merge(config);
};

Config.prototype.readFromFile = function(callback) {
    var self = this;

    if(!self.configfile) {
        return self.setDefaults(callback);
    }

    fs.exists(self.configfile, function(exists) {
        if(!exists) {
            console.info("Config file %s does not exist. Ignoring.", self.configfile);
            return self.setDefaults(callback);
        }

        jsonfile.readFile(self.configfile, function(err, fileConfig) {
            if(err) {
                console.error("Couldn't read config file: %s", err);
                return callback(err);
            }

            self.configread = true;
            self.merge(fileConfig);

            return self.setDefaults(callback);
        });
    });
};

Config.prototype.setDefaults = function(callback) {
    this.graphs = this.graphs || [];
    this.metrics = this.metrics || [];
    this.components = this.components || {};
    return callback();
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

Config.prototype.logdebug = function() {
    if(this.debug) {
        logtxt = sprintf("[%s] %s", moment().format("YYYY-MM-DD HH:mm:ss"), sprintf.apply(this, arguments));
        console.log(logtxt);
    }
};

module.exports = Config;
