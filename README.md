# googleapis-packman

Provides `gen-api-package`, a tool that generates packages in different
programming languages from services defined in protocol buffer IDL.


## Examples

Generate the python package for Google's logging/v2 API, where logging/v2 is
service defined in [googleapis](https://github.com/google/googleapis).


```
gen-api-package --api_name=logging/v2 -l python
```

Generate the ruby package for Google's pubsub/v1 API, where pubsub/v1 is
service defined in [googleapis](https://github.com/google/googleapis).


```sh
gen-api-package --api_name=pubsub/v1 -l ruby
```


# Installation

```sh
npm install -g googleapis-packman
```

# CLI Usage
```
usage: gen-api-package [-h] [-v] [-x] [-i INCLUDEPATH] [-o OUTDIR]
                       [-n APINAME] [-l [LANGUAGES [LANGUAGES ...]]]
                       [-r REPODIR] [-u ZIPURL]
                       [--api_defaults_file APIDEFAULTSFILE]
                       [--dependencies_file DEPSFILE]
                       [--common_protos_file COMMONPBFILE]
                       [--package_prefix PKGPREFIX] [-g]
                       [--override_plugins OVERRIDEPLUGINS]


Creates packages for gRPC services.

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -x, --build_common_protos
                        Build the package of the common google API protobufs.
                        The value of --api_name will be ignored.
  -i INCLUDEPATH, --include_path INCLUDEPATH
                        Include path for additional protos This is a
                        PATH-like value used to locate shared proto
                        defintions outside of an apis directory, but within
                        services_root or repository
  -o OUTDIR, --out_dir OUTDIR
                        The directory in which the generated packages will be
                        saved.
  -n APINAME, --api_name APINAME
                        Name of the api to generate The name should include
                        the version component; e.g. use "pubsub/v1" to
                        specify the protos in pubsub/v1 sub-directory of the
                        services_root
  -l [LANGUAGES [LANGUAGES ...]], --languages [LANGUAGES [LANGUAGES ...]]
                        Specifies the language packages to be generated
  -r REPODIR, --services_root REPODIR
                        The directory containing the rpc service proto
                        definitions. Should not be specified with
                        -r/--protobuf, which clobbers this.
  -u ZIPURL, --zip_url ZIPURL
                        URL of a git repository containing the rpc proto
                        definitions. Should not be specified with
                        -r/--protobuf_root, which will be ignored
  --api_defaults_file APIDEFAULTSFILE
                        Specifies an alternate location for the api_defaults
                        config file api_defaults configures shared metadata
                        that is may be included in all the package files
  --dependencies_file DEPSFILE
                        Specifies an alternate location for the deps config
                        file dependencies configures the package dependencies
                        to include in the generated package file
  --common_protos_file COMMONPBFILE
                        Specifies an alternate location for the common protos
                        config file common_protos configures the paths to
                        include when generating common protos
  --package_prefix PKGPREFIX
                        Prefix to use when constructing package names if
                        is_google_api is set, this defaults to "grpc-google-"
                        otherwise the default is ""
  -g, --is_google_api   When set indicates that the API is an official google
                        API. This means that there is a top-level google dir
                        beneath the root
  --override_plugins OVERRIDEPLUGINS
                        Specifies the override protoc plugins to be used

```
