'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');

var configPath = function configPath(base) {
  return path.join(__dirname, '..', 'config', base);
}

var loadYamlSync = function loadYamlSync(path) {
  return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
};

var defaultDepPath = configPath('dependencies.yml');
var defaultApiPath = configPath('api_defaults.yml');
var defaultCommonProtosPath = configPath('common_protos.yml');

exports.defaults = {
  api: loadYamlSync(defaultApiPath),
  dependencies: loadYamlSync(defaultDepPath)
};

exports.commonProtoPkgs = loadYamlSync(defaultCommonProtosPath);
