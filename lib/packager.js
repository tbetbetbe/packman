/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var _ = require('lodash');
var async = require('async');
var config = require('./config');
var fs = require('fs-extra');
var path = require('path');
var glob = require('glob');

var Mustache = require('mustache');

exports.go = makeGolangPackage;
exports.java = makeJavaPackage;
exports.nodejs = makeNodejsPackage;
exports.objc = makeObjcPackage;
exports.python = makePythonPackage;
exports.ruby = makeRubyPackage;

var settings = {
  'go': {
    'copyables': [
      'PUBLISHING.md',
      '../LICENSE'
    ]
  },
  'java': {
    'copyables': [
      'gradle/wrapper/gradle-wrapper.jar',
      'gradle/wrapper/gradle-wrapper.properties',
      'gradlew',
      'gradlew.bat',
      'PUBLISHING.md',
      '../LICENSE'
    ],
    'templates': [
      'build.gradle.mustache'
    ]
  },
  'nodejs': {
    'copyables': [
      'PUBLISHING.md',
      '../LICENSE',
      'index.js'
    ],
    'templates': [
      'README.md.mustache',
      'package.json.mustache'
    ]
  },
  'objc': {
    'copyables': [
      'PUBLISHING.md',
      '../LICENSE'
    ],
    'templates': [
      'podspec.mustache'
    ]
  },
  'python': {
    'copyables': [
      'PUBLISHING.rst',
      'MANIFEST.in',
      '../LICENSE'
    ],
    'templates': [
      'README.rst.mustache',
      'setup.py.mustache',
      'requirements.txt.mustache'
    ]
  },
  'ruby': {
    'copyables': [
      'Gemfile',
      'PUBLISHING.md',
      '../LICENSE',
      'Rakefile'
    ],
    'templates': [
      'gemspec.mustache'
    ]
  }
};

/**
 * makeGolangPackage creates a Go package.
 *
 * @param {object} opts contains settings used to configure the package.
 * @param {function} done is called once the package is created.
 */
function makeGolangPackage(opts, done) {
  opts = _.merge({}, settings.go, opts);
  var tasks = [];

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, f);
    if (f === '../LICENSE') {
      dst = path.join(opts.top, 'LICENSE');
    }
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  async.parallel(tasks, function(err) {
    if (!err && opts.copyables.indexOf('PUBLISHING.md') != -1) {
      console.log('The golang package', packageName, 'was created in',
                  opts.top);
      console.log('To publish it, read', path.join(opts.top, 'PUBLISHING.md'),
                  'for the next steps');
    }
    done(err);
  });
}

function removeMustacheExt(filePath) {
  var extIndex = filePath.lastIndexOf('.mustache');
  if (extIndex === -1) {
    return filePath;
  }
  return filePath.slice(0, extIndex);
}

/**
 * makePythonPackage creates a new python package.
 *
 * @param {object} opts contains settings used to configure the package.
 * @param {function} done is called once the package is created.
 */
function makePythonPackage(opts, done) {
  opts = _.merge({}, settings.python, opts);
  var tasks = [];

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, f);
    if (f === '../LICENSE') {
      dst = path.join(opts.top, 'LICENSE');
    }
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  var nsPackages = [];
  var knownNamespaces = config.pythonPkg(opts).namespaces;

  function add1Pkg(pkgDir) {
    var dst = path.join(opts.top, pkgDir, '__init__.py');
    var src = path.join(opts.templateDir, '__init__.py');
    var basename = path.basename(pkgDir);

    // Rule for deciding when to create a namespace package
    //
    // - when building common protos, only those dirs that are 'known'
    // namespaces into namespace packages
    //
    // - when building normal services, apart from the version dir
    // is a namespace package
    var pkg = pkgDir.replace(/\/$/, '').replace(/\//g, '.');
    if (opts.buildCommonProtos && _.contains(knownNamespaces, pkg)) {
      src = path.join(opts.templateDir, 'namespace__init__.py');
      nsPackages.push(pkg);
    }
    if (!opts.buildCommonProtos && basename !== opts.packageInfo.api.version) {
      src = path.join(opts.templateDir, 'namespace__init__.py');
      nsPackages.push(pkg);
    }
    fs.copySync(src, dst);
  }

  /**
   * addPackageFiles adds the required python __init__.py files to each
   * directory in the python package.
   *
   * All directories beneath opts.top must be python packages; this function
   * adds the necessary  __init__.py fiels.
   */
  var addPackageFiles = function addPackageFiles(next) {
    console.log('setting up python package in: %s', opts.top);
    var finished = false;
    var nsPackages = [];
    var knownNamespaces = config.pythonPkg(opts).namespaces;

    var addPkgs = function addPkgs(err, pkgDirs) {
      if (err) {
        next(err);
      } else {
        var add1Pkg = function add1Pkg(pkgDir) {
          var dst = path.join(opts.top, pkgDir, '__init__.py');
          var src = path.join(opts.templateDir, '__init__.py');
          var basename = path.basename(pkgDir);

          // Rule for deciding when to create a namespace package
          //
          // - when building common protos, only those dirs that are 'known'
          // namespaces into namespace packages
          //
          // - when building normal services, apart from the version dir
          // is a namespace package
          var pkg = pkgDir.replace(/\/$/, '').replace(/\//g, '.');
          if (opts.buildCommonProtos && _.contains(knownNamespaces, pkg)) {
            src = path.join(opts.templateDir, 'namespace__init__.py');
            nsPackages.push(pkg);
          }
          if (!opts.buildCommonProtos && basename !== opts.packageInfo.api.version) {
            src = path.join(opts.templateDir, 'namespace__init__.py');
            nsPackages.push(pkg);
          }
          fs.copySync(src, dst);
        };
        _.each(pkgDirs, add1Pkg);
        opts.packageInfo.api.nsPackages = nsPackages;
        next(null);
      }
    };
    glob.glob("**/", { cwd: opts.top }, addPkgs);
  };
  tasks.push(addPackageFiles);

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = removeMustacheExt(f);
    var tmpl = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, dstBase);
    tasks.push(expand.bind(null, tmpl, dst, opts.packageInfo));
  });

  async.series(tasks, function(err) {
    if (!err && opts.copyables.indexOf('PUBLISHING.rst') != -1) {
      console.log('The python package', packageName, 'was created in',
                  opts.top);
      console.log('To publish it, read', path.join(opts.top, 'PUBLISHING.rst'),
                  'for the next steps');

    }
    done(err);
  });
}

/**
 * makeJavaPackage creates a new java package.
 *
 * @param {object} opts contains settings used to configure the package.
 * @param {function} done is called once the package is created.
 */
function makeJavaPackage(opts, done) {
  opts = _.merge({}, settings.java, opts);
  var tasks = [];

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, f);
    if (f === '../LICENSE') {
      dst = path.join(opts.top, 'LICENSE');
    }
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = removeMustacheExt(f);
    var tmpl = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, dstBase);
    tasks.push(expand.bind(null, tmpl, dst, opts.packageInfo));
  });

  async.parallel(tasks, function(err) {
    if (!err && opts.copyables.indexOf('PUBLISHING.md') != -1) {
      console.log('The java package', packageName, 'was created in',
                  opts.top);
      console.log('To publish it, read', path.join(opts.top, 'PUBLISHING.md'),
                  'for the next steps');
    }
    done(err);
  });
}

/**
 * makeNodejsPackage creates a new nodejs package.
 *
 * @param {object} opts contains settings used to configure the package.
 * @param {function} done is called once the package is created.
 */
function makeNodejsPackage(opts, done) {
  opts = _.merge({}, settings.nodejs, opts);
  var tasks = [];

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, f);
    if (f === '../LICENSE') {
      dst = path.join(opts.top, 'LICENSE');
    }
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = removeMustacheExt(f);
    var tmpl = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, dstBase);
    tasks.push(expand.bind(null, tmpl, dst, opts.packageInfo));
  });

  async.parallel(tasks, function(err) {
    if (!err && opts.copyables.indexOf('PUBLISHING.md') != -1) {
      console.log('The nodejs package', packageName, 'was created in',
                  opts.top);
      console.log('To publish it, read', path.join(opts.top, 'PUBLISHING.md'),
                  'for the next steps');
    }
    done(err);
  });
}

/**
 * makeObjcPackage creates a new objective-c package.
 *
 * @param {object} opts contains settings used to configure the package.
 * @param {function} done is called once the package is created.
 */
function makeObjcPackage(opts, done) {
  opts = _.merge({}, settings.objc, opts);
  var tasks = [];

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, f);
    if (f === '../LICENSE') {
      dst = path.join(opts.top, 'LICENSE');
    }
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = f;
    if (dstBase === 'podspec.mustache') {
      dstBase = packageName + '.podspec';
    }
    var tmpl = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, dstBase);
    tasks.push(expand.bind(null, tmpl, dst, opts.packageInfo));
  });

  async.parallel(tasks, function(err) {
    if (!err && opts.copyables.indexOf('PUBLISHING.md') != -1) {
      console.log('The objective-c package', packageName, 'was created in',
                  opts.top);
      console.log('To publish it, read', path.join(opts.top, 'PUBLISHING.md'),
                  'for the next steps');
    }
    done(err);
  });
}

/**
 * makeRubyPackage creates a new ruby package.
 *
 * @param {object} opts contains settings used to configure the package.
 * @param {function} done is called once the package is created.
 */
function makeRubyPackage(opts, done) {
  opts = _.merge({}, settings.ruby, opts);
  fs.mkdirsSync(path.join(opts.top, 'lib'));
  var tasks = [];

  // Move the generated files to the lib dir.
  opts.generated = opts.generated || [];
  opts.generated.forEach(function(f) {
    var src = path.join(opts.top, f)
    , dst = path.join(opts.top, 'lib', f);
    tasks.push(fs.move.bind(fs, src, dst));
  });

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, f);
    if (f === '../LICENSE') {
      dst = path.join(opts.top, 'LICENSE');
    }
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = f;
    if (dstBase === 'gemspec.mustache') {
      dstBase = packageName + '.gemspec';
    }
    var tmpl = path.join(opts.templateDir, f)
    , dst = path.join(opts.top, dstBase);
    tasks.push(expand.bind(null, tmpl, dst, opts.packageInfo));
  });

  async.parallel(tasks, function(err) {
    if (!err && opts.copyables.indexOf('PUBLISHING.md') != -1) {
      console.log('The ruby package', packageName, 'was created in',
                  opts.top);
      console.log('To publish it, read', path.join(opts.top, 'PUBLISHING.md'),
                  'for the next steps');
    }
    done(err);
  });
}

/**
 * Expands the contents of a template file, saving it to an output file.
 *
 * @param {string} template the path to the template file
 * @param {string} dst the path of the expanded output
 * @param {Object} params object containing the named parameter values
 * @param {function(Error, string)} done is called with the rendered template
 */
function expand(template, dst, params, done) {
  // renders and saves the output file
  var render = function render(err, renderable) {
    if (err) {
      if (err.code === "ENOENT") {
        done();  /* It's OK for templates not to be present in some cases */
      } else {
        console.error('Expansion of %s to %s failed with %s', template, dst, err);
        done(err);
      }
    } else {
      fs.writeFile(dst, Mustache.render(renderable, params), done);
    }
  };
  fs.readFile(template, {encoding: 'utf-8'}, render);
}
