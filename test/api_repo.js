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
var chai = require('chai');
chai.use(require('dirty-chai'));
var child_process = require('child_process');
var expect = chai.expect;
var fs = require('fs-extra');
var nock = require('nock');
var path = require('path');
var tmp = require('tmp');
var url = require('url');

var ApiRepo = require('../lib/api_repo').ApiRepo;
var parseApiName = require('../lib/api_repo').parseApiName;

function addFakeBinsToPath() {
  var tmpObj = tmp.dirSync();
  var fakePath = tmpObj.name + ":" + process.env.PATH;
  var fakeBins = _.map(
      arguments,
      function(arg) {
        var bin = path.join(tmpObj.name, arg);
        if (arg == 'protoc') {
          // copy the fake protoc the path dir
          fs.copySync(path.join(__dirname, 'fixtures/fake_protoc'), bin);
        } else {
          // touch the bin to that's present
          fs.closeSync(fs.openSync(bin, 'w', 493 /* 0755 */));
        }
        return bin;
      });
  return {
    bins: fakeBins,
    path: fakePath
  };
}

function addFakeProtocToPath() {
  var goodDir = tmp.dirSync();
  var badDir = tmp.dirSync();
  var goodPath = goodDir.name + ":" + process.env.PATH;
  var badPath = badDir.name + ":" + process.env.PATH;
  fs.copySync(path.join(__dirname, 'fixtures/fake_protoc') ,
              path.join(goodDir.name, 'protoc'));
  fs.copySync(path.join(__dirname, 'fixtures/failing_protoc') ,
              path.join(badDir.name, 'protoc'));
  return {
    'badDir': badDir.name,
    'badPath': badPath,
    'path': goodPath,
    'dir': goodDir.name
  };
}

// Support simulating the download of the repo.
nock.disableNetConnect();
var goodZip = path.join(__dirname, 'fixtures/master.zip');
var getsGoodZipFrom = function getsGoodZipFrom(uri) {
  var urlObj = url.parse(uri);
  var host = urlObj.protocol + "//" + urlObj.hostname;
  if (urlObj.protocol == "https") {
    host =+ ":443";
  }
  console.log('Getting zip at %s%s', urlObj.hostname, urlObj.pathname);
  nock(host).get(urlObj.pathname).replyWithFile(200, goodZip);
};

var errsOn = function errsOn(done) {
  var shouldFail = function shouldFail(err) {
    expect(err).to.not.be.null();
    done();
  };
  return shouldFail;
};

var passesOn = function passesOn(done) {
  var shouldPass = function shouldPass(err) {
    expect(err).to.be.null();
    done();
  };
  return shouldPass;
};

describe('parseApiName', function() {
  var tests = [
    {
      name: 'pubsub/v1',
      want: ['pubsub', 'v1']
    },
    {
      name: 'devtools/cloudtrace/v2',
      want: ['devtools/cloudtrace', 'v2']
    }
  ];
  _.forEach(tests, function(t) {
    it('should parse ' + t.name + ' ok', function() {
      expect(parseApiName(t.name)).to.eql(t.want);
    });
  });
});

describe('ApiRepo', function() {
  describe('on the test fixture repo with no plugins', function() {
    var fakes, repo;
    describe('configured for nodejs', function(){
      beforeEach(function() {
        repo = new ApiRepo({
          isGoogleApi: true,
          includePath: [path.join(__dirname, 'fixtures', 'include')],
          languages: ['nodejs'],
          templateRoot: path.join(__dirname, '..', 'templates')
        });
        getsGoodZipFrom(repo.zipUrl);
      });
      describe('method `buildPackages`', function() {
        it('should fail on unrecognized apis', function(done) {
          repo.on('error', function(err) {
            expect(err).to.not.be.null();
          });
          repo.on('ready', function() {
            repo.buildPackages('notpubsub', 'v1beta2', errsOn(done));
          });
          repo.setUp();
        });
        it('should pass for known packages', function(done) {
          repo.on('error', function(err) {
            expect(err).to.be.null();
          });
          repo.on('ready', function() {
            console.log('about to build pubsub v1 nodejs packages');
            repo.buildPackages('pubsub', 'v1', passesOn(done));
          });
          repo.setUp();
        });
      });
    });
    describe('configured for python', function(){
      beforeEach(function() {
        var testBins = ['protoc', 'grpc_python_plugin'];
        fakes = addFakeBinsToPath.apply(null, testBins);
        repo = new ApiRepo({
          env: {'PATH': fakes.path},
          isGoogleApi: true,
          languages: ['python'],
          templateRoot: path.join(__dirname, '..', 'templates')
        });
        getsGoodZipFrom(repo.zipUrl);
      });
      describe('method `buildGaxPackages`', function() {
        it('should succeed with unrecognized apis', function(done) {
          repo.on('error', function(err) {
            expect(err).to.not.be.null();
          });
          repo.on('ready', function() {
            repo.buildGaxPackages('notpubsub', 'v1beta2', passesOn(done));
          });
          repo.setUp();
        });
        it('should pass for known packages', function(done) {
          repo.on('error', function(err) {
            throw new Error('should not be reached');
          });
          repo.on('ready', function() {
            repo.buildGaxPackages('pubsub', 'v1beta2', passesOn(done));
          });
          repo.setUp();
        });
      });
      describe('method `buildCommonProtoPkgs`', function() {
        it('should pass', function(done) {
          repo.on('error', function(err) {
            throw new Error('should not be reached');
          });
          repo.on('ready', function() {
            repo.buildCommonProtoPkgs(passesOn(done));
          });
          repo.setUp();
        });
      });
    });
    describe('configured for ruby', function(){
      beforeEach(function() {
        var testBins = ['protoc', 'grpc_ruby_plugin'];
        fakes = addFakeBinsToPath.apply(null, testBins);
        repo = new ApiRepo({
          env: {'PATH': fakes.path},
          isGoogleApi: true,
          languages: ['ruby'],
          templateRoot: path.join(__dirname, '..', 'templates')
        });
        getsGoodZipFrom(repo.zipUrl);
      });
      describe('method `buildCommonProtoPkgs`', function() {
        it('should pass', function(done) {
          repo.on('error', function(err) {
            throw new Error('should not be reached');
          });
          repo.on('ready', function() {
            repo.buildCommonProtoPkgs(passesOn(done));
          });
          repo.setUp();
        });
      });
    });
  });
  describe('on the test fixture repo with python and ruby plugins', function() {
    var fakes, repo;
    before(function() {
      var testBins = ['protoc', 'grpc_python_plugin', 'grpc_ruby_plugin'];
      fakes = addFakeBinsToPath.apply(null, testBins);
    });
    after(function() {
      fakes.bins.forEach(function(bin) {
        fs.unlinkSync(bin);
      });
    });
    describe('configured for ruby and python', function(){
      describe('method `setUp`', function() {
        beforeEach(function() {
          repo = new ApiRepo({
            env: {'PATH': fakes.path},
            isGoogleApi: true,
            languages: ['ruby', 'python'],
            templateRoot: path.join(__dirname, '..', 'templates')
          });
          getsGoodZipFrom(repo.zipUrl);
        });
        it('should fire the ready event', function(done) {
          repo.on('error', function(err) {
            throw new Error('should not be reached');
          });
          repo.on('ready', function() {
            done();
          });
          repo.setUp();
        });
      });
      describe('method `buildPackages`', function() {
        beforeEach(function() {
          repo = new ApiRepo({
            env: {'PATH': fakes.path},
            isGoogleApi: true,
            languages: ['ruby', 'python'],
            templateRoot: path.join(__dirname, '..', 'templates')
          });
          getsGoodZipFrom(repo.zipUrl);
        });
        it('should pass for known packages', function(done) {
          repo.on('error', function(err) {
            throw new Error('should not be reached');
          });
          repo.on('ready', function() {
            repo.buildPackages('pubsub', 'v1beta2', passesOn(done));
          });
          repo.setUp();
        });
        it('should fail on unrecognized apis', function(done) {
          repo.on('error', function(err) {
            expect(err).to.not.be.null();
          });
          repo.on('ready', function() {
            repo.buildPackages('notpubsub', 'v1beta2', errsOn(done));
          });
          repo.setUp();
        });
        it('should fail on unrecognized versions', function(done) {
          repo.on('error', function(err) {
            expect(err).to.not.be.null();
          });
          repo.on('ready', function() {
            repo.buildPackages('pubsub', 'v1alpha5', errsOn(done));
          });
          repo.setUp();
        });
      });
    });
  });
  describe('method `_buildProtos`', function() {
    var fakes, repo, failingRepo;
    beforeEach(function(done) {
      fakes = addFakeProtocToPath();
      repo = new ApiRepo({
        isGoogleApi: true,
        env: {'PATH': fakes.path}
      });
      getsGoodZipFrom(repo.zipUrl);
      repo._checkRepo(done); // partially initialize the repo
    });
    afterEach(function() {
      fs.unlinkSync(path.join(fakes.dir, 'protoc'));
      fs.unlinkSync(path.join(fakes.badDir, 'protoc'));
    });
    it('should pass when run for a configured language', function(done) {
      var shouldPass = function(err, data) {
        // the fake_protoc just copies the protos to a path beneath the output
        // dir so data should just consist of the paths to the copies.
        var want = [
          "google/pubsub/v1beta2/pubsub.proto"
        ];
        expect(err).to.be.null();
        expect(data).to.deep.eql(want);
        done();
      };

      // thisTest asserts that _buildProtos fails if api does not exist in the
      // fixture repo.
      var thisTest = function thisTest(err) {
        expect(err).to.be.null();
        repo._buildProtos('pubsub', 'v1beta2', 'python', shouldPass);
      };
      repo._checkRepo(thisTest);
    });
    it('should fail if a plugin for the configured language is not available', function(done) {
      var thisTest = function thisTest(err) {
        expect(err).to.be.null();
        repo._buildProtos('pubsub', 'v1beta2', 'scala', errsOn(done));
      };
      repo._checkRepo(thisTest);
    });
    it('should fail if the version does not exist for this api', function(done) {
      var thisTest = function thisTest(err) {
        expect(err).to.be.null();
        repo._buildProtos('pubsub', 'v0alpha', 'python', errsOn(done));
      };
      repo._checkRepo(thisTest);
    });
    it('should fail if the specified api does not exist', function(done) {
      var thisTest = function thisTest(err) {
        expect(err).to.be.null();
        repo._buildProtos('notpubsub', 'v1beta2', 'python', errsOn(done));
      };
      repo._checkRepo(thisTest);
    });
    it('should fail if protoc fails during build', function(done) {
      var badProtocRepo = new ApiRepo({
        isGoogleApi: true,
        env: {'PATH': fakes.badPath}
      });
      getsGoodZipFrom(badProtocRepo.zipUrl);

      // thisTest asserts that _buildProtos fails if protoc fails while running
      // against the protos in the test fixture repo.
      var thisTest = function thisTest(err) {
        expect(err).to.be.null();
        badProtocRepo._buildProtos('pubsub', 'v1beta2', 'python', errsOn(done));
      };
      badProtocRepo._checkRepo(thisTest);
    });
  });
  describe('method `_findProtocFunc`', function() {
    var fakes, repo
    , fakeProto = 'not/a/real/service.proto';
    before(function() {
      fakes = addFakeProtocToPath();
      repo = new ApiRepo({
        repoDir: fakes.dir
      });
    });
    after(function() {
      fs.unlinkSync(path.join(fakes.dir, 'protoc'));
      fs.unlinkSync(path.join(fakes.badDir, 'protoc'));
    });
    it('should fail if protoc fails', function(done) {
      var protoc = repo._makeProtocFunc({
        env: {'PATH': fakes.badPath}
      }, 'python');
      protoc(fakeProto, errsOn(done));
    });
    it('should obtain a func that runs protoc', function(done) {
      var shouldPass = function(err, got) {
        expect(err).to.be.null();
        // The test uses the fake protoc, so it just echoes its args
        var want = '--python_out=' + path.join(repo.outDir, 'python');
        want += ' -I.';
        want += ' -I/usr/local/include';
        want += ' --grpc_out=' + path.join(repo.outDir, 'python');
        want += ' --plugin=protoc-gen-grpc=/testing/bin/my_python_plugin';
        want += ' ' + fakeProto + '\n';
        expect(got).to.contain(want);
        done();
      };
      repo.depBins = {'grpc_python_plugin': '/testing/bin/my_python_plugin'};
      var protoc = repo._makeProtocFunc({
        env: {'PATH': fakes.path}
      }, 'python');
      protoc(fakeProto, shouldPass);
    });
    it('should obtain a func that runs protoc with the right includePath',
       function(done) {
         var shouldPass = function(err, got) {
           expect(err).to.be.null();
           // The test uses the fake protoc, so it just echoes its args
           var want = '--python_out=' + path.join(repo.outDir, 'python');
           want += ' -I.';
           want += ' -I/an/include/path';
           want += ' -I/another/include/path';
           want += ' --grpc_out=' + path.join(repo.outDir, 'python');
           want += ' --plugin=protoc-gen-grpc=/testing/bin/my_python_plugin';
           want += ' ' + fakeProto + '\n';
           expect(got).to.contain(want);
           done();
         };
         repo.depBins = {'grpc_python_plugin': '/testing/bin/my_python_plugin'};
         repo.includePath = ['/an/include/path', '/another/include/path'];
         var protoc = repo._makeProtocFunc({
           env: {'PATH': fakes.path}
         }, 'python');
         protoc(fakeProto, shouldPass);
       });
    it('should obtain a func that runs protoc for GoLang', function(done) {
      var shouldPass = function(err, got) {
        expect(err).to.be.null();
        // The test uses the fake protoc, so it just echoes its args
        var want = '--go_out=plugins=grpc:' + path.join(repo.outDir, 'go');
        want += ' ' + fakeProto + '\n';
        expect(got).to.contain(want);
        done();
      };
      var protoc = repo._makeProtocFunc({
        env: {'PATH': fakes.path}
      }, 'go');
      protoc(fakeProto, shouldPass);
    });
  });
  describe('method `_findProtos`', function() {
    var repo;
    beforeEach(function(done) {
      repo = new ApiRepo({
        isGoogleApi: true
      });
      getsGoodZipFrom(repo.zipUrl);
      repo._checkRepo(done); // partially initialize the repo
    });
    it('should fail if no dir matches name and version', function(done) {
      repo._findProtos('notpubsub', 'notaversion', errsOn(done));
    });
    var fixtureProtos = [
      ['pubsub', 'v1beta2', 'pubsub.proto'],
      ['example/library', 'v1', 'library.proto']
    ];
    fixtureProtos.forEach(function(f) {
      it('should detect the ' + f[0] + ' ' + f[1]+ ' protos', function(done) {
        var foundProtos = [];
        var onProto = function onProto(p, cb) {
          foundProtos.push(p);
          cb(null);
        };
        var shouldBeOK = function(err, protos) {
          var want = [
            path.join('google', f[0], f[1], f[2])
          ];
          expect(err).to.be.null();
          expect(protos).to.deep.eql(want);
          done();
        };
        repo._findProtos(f[0], f[1], shouldBeOK, onProto);
      });
    });
  });
  describe('method `_checkRepo()`', function() {
    var doesNotExist
    , withoutSubdir
    , withSubdir
    , notADir;
    before(function() {
      withoutSubdir = tmp.dirSync().name;
      withSubdir = tmp.dirSync().name;
      fs.mkdirsSync(path.join(withSubdir, 'google'));
      doesNotExist = tmp.tmpNameSync();
      notADir = tmp.fileSync().name;
    });
    after(function() {
      fs.unlinkSync(notADir);
    });
    it('should pass if repoDir and reqd subdir are present', function(done) {
      var repo = new ApiRepo({
        repoDir: withSubdir,
        isGoogleApi: true
      });
      repo._checkRepo(passesOn(done));
    });
    it('should pass if repoDir is present', function(done) {
      var repo = new ApiRepo({
        repoDir: withoutSubdir
      });
      repo._checkRepo(passesOn(done));
    });
    it('should fail if repoDir is missing reqd subdir', function(done) {
      var repo = new ApiRepo({
        repoDir: withoutSubdir,
        isGoogleApi: true
      });
      repo._checkRepo(errsOn(done));
    });
    it('should fail if repoDir does not exist', function(done) {
      var repo = new ApiRepo({
        repoDir: doesNotExist
      });
      repo._checkRepo(errsOn(done));
    });
    it('should fail if repoDir is a file', function(done) {
      var repo = new ApiRepo({
        repoDir: notADir
      });
      repo._checkRepo(errsOn(done));
    });
    describe('when no repoDir is set', function(){
      it('should download the default repo', function(done) {
        var repo = new ApiRepo();
        expect(repo.zipUrl).to.not.be.null();
        expect(repo.repoDir).to.be.undefined();
        var shouldBeOK = function(err) {
          expect(err).to.be.null();
          expect(repo.repoDir).to.not.be.null();
          done();
        };
        getsGoodZipFrom(repo.zipUrl);
        repo._checkRepo(shouldBeOK);
      });
      it('should verify the default repo subdir', function(done) {
        var repo = new ApiRepo({
          isGoogleApi: true
        });
        expect(repo.zipUrl).to.not.be.null();
        expect(repo.repoDir).to.be.undefined();
        var shouldBeOK = function(err) {
          expect(err).to.be.null();
          expect(repo.repoDir).to.not.be.null();
          done();
        };
        getsGoodZipFrom(repo.zipUrl);
        repo._checkRepo(shouldBeOK);
      });
    });
  });
  describe('method `_checkDeps()`', function() {
    var fakes;
    before(function() {
      var testBins = ['protoc', 'grpc_scala_plugin', 'grpc_lisp_plugin'];
      fakes = addFakeBinsToPath.apply(null, testBins);
    });
    after(function() {
      fakes.bins.forEach(function(bin) {
        fs.unlinkSync(bin);
      });
    });

    it('should fail if protoc is not on the PATH', function(done) {
      var repo = new ApiRepo({
        languages: []
      });
      repo._checkDeps({env: {'PATH': 'ignored'}}, errsOn(done));
    });
    it('should pass if protoc is on the PATH', function(done) {
      var repo = new ApiRepo({
        languages: []
      });
      var shouldNotError = function(err, result) {
        expect(err).to.be.null();
        expect(result).to.be.ok();
        done();
      };
      repo._checkDeps({env: {'PATH': fakes.path}}, shouldNotError);
    });
    it('should pass if the plugins are on the PATH', function(done) {
      var repo = new ApiRepo({
        languages: ['lisp', 'scala']
      });
      var shouldNotError = function(err, result) {
        expect(err).to.be.null();
        expect(result).to.be.ok();
        done();
      };
      repo._checkDeps({env: {'PATH': fakes.path}}, shouldNotError);
    });
    it('should fail if any plugins are not on the PATH', function(done) {
      var repo = new ApiRepo({
        languages: ['lisp', 'scala', 'scheme']
      });
      repo._checkDeps({env: {'PATH': fakes.path}}, errsOn(done));
    });
  });
});
