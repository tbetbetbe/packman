'use strict';

var _ = require('lodash');
var config = require('../lib/config');
var expect = require('chai').expect;
var fs = require('fs-extra');
var path = require('path');
var tmp = require('tmp');

function addFakeConfigFile(name, someYaml) {
  var tmpObj = tmp.dirSync();
  var configFile = path.join(tmpObj.name, name);
  fs.writeFileSync(configFile, someYaml);
  return configFile;
}

describe('config', function() {
  var fakeYaml = "what:\n" +
      "  - is\n" +
      "  - this\n";

  describe('method `packageInfo`', function() {
    it('has a value by default', function() {
      expect(config.packageInfo()).to.be.ok;
    });

    it('can load values via a config file', function() {
      var opts = {
        depsFile: addFakeConfigFile('deps', fakeYaml),
        apiDefaultsFile: addFakeConfigFile('apiDefaults', fakeYaml)
      };
      expect(config.packageInfo(opts)).to.be.ok;
      expect(config.packageInfo(opts).api.what).to.eql(['is', 'this']);
      expect(config.packageInfo(opts).dependencies.what).to.eql(['is', 'this']);
    });
  });

  describe('method `commonPbPkgs`', function() {
    it('has a value by default', function() {
      expect(config.commonPbPkgs()).to.be.ok;
    });

    it('can load values via a config file', function() {
      var opts = {
        commonPbFile: addFakeConfigFile('commonPb', fakeYaml)
      };
      expect(config.commonPbPkgs(opts)).to.be.ok;
      expect(config.commonPbPkgs(opts).what).to.eql(['is', 'this']);
    });
  });

  describe('method `pythonPkg`', function() {
    it('has a value by default', function() {
      expect(config.pythonPkg()).to.be.ok;
    });

    it('can load values via a config file', function() {
      var opts = {
        pythonPkgFile: addFakeConfigFile('pythonPkg', fakeYaml)
      };
      expect(config.pythonPkg(opts)).to.be.ok;
      expect(config.pythonPkg(opts).what).to.eql(['is', 'this']);
    });
  });
});
