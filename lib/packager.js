'use strict';

var _ = require('lodash');
var async = require('async');
var config = require('./config');
var fs = require('fs-extra');
var path = require('path');

var FindFiles = require('node-find-files');
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
      'LICENSE'
    ]
  },
  'java': {
    'copyables': [
      'gradle/wrapper/gradle-wrapper.jar',
      'gradle/wrapper/gradle-wrapper.properties',
      'gradlew',
      'gradlew.bat',
      'PUBLISHING.md',
      'LICENSE'
    ],
    'templates': [
      'build.gradle.mustache'
    ]
  },
  'nodejs': {
    'copyables': [
      'PUBLISHING.md',
      'LICENSE',
      'index.js'
    ],
    'templates': [
      'README.md.mustache',
      'package.json.mustache'
    ]
  },
  'objective_c': {
    'copyables': [
      'PUBLISHING.md',
      'LICENSE'
    ],
    'templates': [
      'podspec.mustache'
    ]
  },
  'python': {
    'copyables': [
      'PUBLISHING.rst',
      'LICENSE'
    ],
    'templates': [
      'README.rst.mustache',
      'setup.py.mustache'
    ]
  },
  'ruby': {
    'copyables': [
      'Gemfile',
      'PUBLISHING.md',
      'LICENSE',
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
    tasks.push(fs.copy.bind(fs, src, dst));
  });

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
    var finder = new FindFiles({
      rootFolder : opts.top,
      filterFunction : function (_unused, stat) {
        return stat.isDirectory();
      }
    });
    finder.on("complete", function() {
      if (!finished) {
        next(null);
        finished = true;
        opts.packageInfo.api.nsPackages = nsPackages;
      }
    });
    finder.on("match", function(pkgDir) {
      var knownNamespaces = config.pythonPkg(opts).namespaces;
      var src = path.join(opts.templateDir, '__init__.py');
      var basename = path.basename(pkgDir);
      var pkgName = pkgDir.replace(opts.top, '').replace(/^\//, '');
      pkgName = pkgName.replace(/\//g, '.');
      if (opts.buildCommonProtos && _.contains(knownNamespaces, pkgName)) {
        src = path.join(opts.templateDir, 'namespace__init__.py');
        nsPackages.push(pkgName);
      }
      if (!opts.buildCommonProtos && basename !== opts.packageInfo.api.version) {
        src = path.join(opts.templateDir, 'namespace__init__.py');
        nsPackages.push(pkgName);
      }
      var dst = path.join(pkgDir, '__init__.py');
      fs.copySync(src, dst);
    });
    finder.on("error", function(err) {
      if (!finished) {
        console.error('failure in addPackageFiles %s', err);
        next(err);
        finished = true;
      }
    });

    finder.startSearch();
  };
  tasks.push(addPackageFiles);

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = f;
    if (dstBase === 'setup.py.mustache') {
      dstBase = 'setup.py';
    }
    if (dstBase === 'README.rst.mustache') {
      dstBase = 'README.rst';
    }
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
    console.log('Copying %s to %s', src, dst);
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = f;
    if (dstBase === 'build.gradle.mustache') {
      dstBase = 'build.gradle';
    }
    var tmpl = path.join(opts.templateDir, f)
      , dst = path.join(opts.top, dstBase);
    tasks.push(expand.bind(null, tmpl, dst, opts.packageInfo));
  });

  async.parallel(tasks, function(err) {
    console.log('what is err %s', err);
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
    tasks.push(fs.copy.bind(fs, src, dst));
  });

  // Move the expanded files to the top-level dir.
  var packageName = opts.packageInfo.api.name + '-' +
      opts.packageInfo.api.version;
  opts.templates.forEach(function(f) {
    var dstBase = f;
    if (dstBase === 'package.json.mustache') {
      dstBase = 'package.json';
    }
    if (dstBase === 'README.md.mustache') {
      dstBase = 'README.md';
    }
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
  opts = _.merge({}, settings.objective_c, opts);
  var tasks = [];

  // Move copyable files to the top-level dir.
  opts.copyables.forEach(function(f) {
    var src = path.join(opts.templateDir, f)
      , dst = path.join(opts.top, f);
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
      console.error('Expansion of %s to %s failed with %s', template, dst, err);
      done(err);
    } else {
      fs.writeFile(dst, Mustache.render(renderable, params), done);
    }
  };
  fs.readFile(template, {encoding: 'utf-8'}, render);
}
