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

var fallback = {
  apiDefaultsFile: configPath('api_defaults.yml'),
  depsFile: configPath('dependencies.yml'),
  commonPbFile: configPath('common_protos.yml'),
  pythonPkgFile: configPath('python_pkg.yml')
};

/**
 * Obtains an object containing the configured or default api/dependencies.
 */
exports.packageInfo = function packageInfo(opts) {
  opts = opts || {};
  var apiDefaultsFile = opts.apiDefaultsFile || fallback.apiDefaultsFile;
  var depsFile = opts.depsFile || fallback.depsFile;
  return {
    api: loadYamlSync(apiDefaultsFile),
    dependencies: loadYamlSync(depsFile),
  };
};

/**
 * Obtains an object containing information about the known common protobuf
 * definitions.
 */
exports.commonPbPkgs = function commonPbPkgs(opts) {
  opts = opts || {};
  var commonPbFile = opts.commonPbFile || fallback.commonPbFile;
  return loadYamlSync(commonPbFile);
};


/**
 * Obtains an object configuring information about the known python packages
 */
exports.pythonPkg = function pythonPkg(opts) {
  opts = opts || {};
  var pythonPkgFile = opts.pythonPkgFile || fallback.pythonPkgFile;
  return loadYamlSync(pythonPkgFile);
};
