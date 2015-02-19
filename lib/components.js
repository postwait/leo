var path = require('path');

function Component(fullPath) {
    this.name = path.basename(fullPath).replace('.js', '');
    this.module = require(fullPath);
    this.config = {};
}

exports.Component = Component;