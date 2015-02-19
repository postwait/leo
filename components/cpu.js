module.exports = function CPU() {
    this.initialize = function(callback) {
        return callback();
    };

    this.prompts = function(callback) {
        return callback();
    };

    this.main = function(callback) {
        this.addMetric("aggcpu`cpu_stat:all:sys:cpu_idle");
        this.addMetric("aggcpu`cpu_stat:all:sys:cpu_user");
        this.addMetric("aggcpu`cpu_stat:all:sys:cpu_kernel");
        this.addMetric("aggcpu`cpu_stat:all:sys:sysfork");
        this.addMetric("aggcpu`cpu_stat:all:sys:syscall");

        this.addGraph("CPU", {
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
        });

        return callback();
    }
};
