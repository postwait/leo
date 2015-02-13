exports.initialize = function(info, callback) {
    callback(null);
};

exports.prompts = function(userConfig, configData, callback) {
    callback(null);
};

exports.main = function(userConfig, configData, callback) {
    configData.graphs["CPU"] = {
        "style": "line",
        "datapoints": [
            {
                "name": "CPU Kernel",
                "metric_name": "aggcpu`cpu_stat:all:sys:cpu_kernel",
                "metric_type": "numeric",
                "axis": "l",
                "stack": 0,
                "derive": "counter",
                "hidden": false
            },
            {
                "name": "CPU User",
                "metric_name": "aggcpu`cpu_stat:all:sys:cpu_user",
                "metric_type": "numeric",
                "axis": "l",
                "stack": 0,
                "derive": "counter",
                "hidden": false
            },
            {
                "name": "CPU Idle",
                "metric_name": "aggcpu`cpu_stat:all:sys:cpu_idle",
                "metric_type": "numeric",
                "axis": "l",
                "stack": 0,
                "derive": "counter",
                "hidden": false
            }
        ]
    };

    configData.metrics.numeric.push(
        "aggcpu`cpu_stat:all:sys:cpu_idle",
        "aggcpu`cpu_stat:all:sys:cpu_user",
        "aggcpu`cpu_stat:all:sys:cpu_kernel",
        "aggcpu`cpu_stat:all:sys:sysfork",
        "aggcpu`cpu_stat:all:sys:syscall"
    );

    callback(null);
};

exports.cleanup = function(userConfig, configData, callback) {
};

