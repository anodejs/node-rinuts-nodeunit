//jslint igonres
/*globals module, console, require */
var fs = require('fs'),
    path = require('path'),    
    rinuts = require('rinuts'),
    exec = require('child_process').exec,
    uuid = require('node-uuid'),
    child,

    // folder ignore list.
    ignorable = {
        Debug: true,        
        DebugChk: true,
        Release: true,
        obj: true,
        TestResults: true
    }

//
// consts:

    // temporary directory
    var tempDir = (process.env.TEMP || process.env.TMP || __dirname) + '\\' + uuid.v1(),
    
    // paths to mstest.exe and mstestEnumarator.exe
    mstestpath = path.join(__dirname, '..\\deps\\mstest\\MSTest10.exe'),
    testEnumaratorPath = path.join(__dirname, '..\\deps\\msTestEnumarator\\MSTestEnumarator.exe'),
    
    // test config file
    testSettings = path.join(__dirname, '..\\deps\\mstest\\local.testsettings'),

    // file containing the enumaration of tests after processing project's dll's by msTestEnumarator
    enumarationFile = path.join(tempDir, 'enumarationFile.txt'),

    // listing file containing path's to all dll's needing to be enumarated
    dllListingFile = path.join(tempDir, 'dllListingFile.txt'),
    

    // mstest.exe timeout. set to 600 sec.
    testTimeOut = 600000;
            
//
// private methods:

//
// Asynchronosly iterates over list, applying fn on each element, and cb when the iteration completes.
// list {array | object implementing array's forEach} - list to iterate on.
// fn {function} - function to be applied on each element in 'list'.
// cb {function} - cb to be called when the iteration terminates, or when encountering an error.
var asyncForEach = function (list, fn, cb) {
        if (!list.length) {
            cb();
        }
        var c = list.length,
            errState = null;
        list.forEach(function (item, i, list) {
            fn(item, function (err) {
                if (errState) {                
                    return;
                }
                if (err) {                
                    return cb(errState = err);
                }
                if (--c === 0) {                
                    return cb();
                }
            });
        });
    },
    
    //
    // Checks if a given path is a directory and applies 'cb' on the boolean result
    // path {string} - path to a file/directory
    // cb {function} - callback to be applied on the boolean result.
    isDirectory = function (path, cb) {
        fs.stat(path, function (err, stat) {
            if (err) {
                cb(err);
                return;
            }

            if (stat.isDirectory()) {
                cb(null, true);
            } else {
                cb(null, false);
            }
        });
    },

    //
    // Loads tests from files and subdirectories contained in the directory at 'dirPath'.
    // Applies 'cb' an array of the tests metadata in the form of: 
    //  [{testName: *The test name*, dllPath: *The path to the containing dll*}]
    //  paths {array} : array of paths to directories and files containing .NET .dll files which contain mstests.
    loadfiles = function (paths, cb) {
        enumarateFiles(paths, function (err, filesPaths) {
            var tests,
                paths = '';
            if (err) {
                console.error('File enumaration failed');
                cb(err);
                return;
            }

            filesPaths.forEach(function (path) {
                paths = paths.concat(path, '\n');
            });

            paths = paths.substring(0, paths.length - 1); // remove trailing carriage return
            fs.writeFile(dllListingFile, paths, function (err) {
                if (err) {
                    console.error('Could not write to file: ', dllListingFile);
                    cb(err);
                }

                console.log('MSTestEnumarator is starting to run');
                child = exec(testEnumaratorPath + ' ' + enumarationFile + ' ' + dllListingFile, 
					{
                        encoding: 'utf8',
                        timeout: 0,
                        maxBuffer: 200 * 1024,
                        killSignal: 'SIGTERM',
                        cwd: null,                        
                    },
					function (err, stdout, stderr) {                    
					if (err) {
                        console.error('MSTestEnumarator Failed on paths', paths);
                        console.error('stderr:', stderr);
                        console.error('stdout:', stdout);
                        cb(err);
                        return;
                    }

                    console.log('MSTestEnumarator has finished running');
                    try {
                        tests = require(enumarationFile);
                        cb(null, tests);
                    } catch (err) {
                        console.error('Failed to enumarate tests in file: ', enumarationFile);
                        cb(err);
                    }
                });
            });
        });
    },

    //
    // Enumarates a directory's dll files. Ignores the 'obj' directory, assuming it contains intermediate files.    
    // filePaths {array} - an array of file paths (files can also be directories).
    // cb {function} - callback when the enumaration completes. its second argument is an
    //     array of dll paths.   
    enumarateFiles = function (filePaths, cb) {        
        var filedlls = [];
        asyncForEach(
            filePaths,
            function (path, cb) {
                isDirectory(path, function (err, result) {
                    var splitPath;
                    if (err) {
                        cb(err);
                        return;
                    }

                    if (result) {
                        splitPath = path.split('\\');
                        if (ignorable[splitPath[splitPath.length - 1]]){ // ignore 'ignorable' directories
                            cb();
                        } else {
                            enumarateDir(path, function (err, resultdlls) {
                                if (err) {
                                    cb(err);
                                    return;
                                }
                                filedlls = filedlls.concat(resultdlls);
                                cb();   // continuation 
                            });
                        }
                    } else { 
                        if (path.substring(path.length - 4, path.length) === '.dll') { // add only dlls
                            filedlls.push(path);
                        }
                        cb();   // continuation 
                    }
                });
            },
            function (err) {
                cb(err, filedlls);
            }
        );
    },
    
    //
    // Enumarates a directory's dll files.
    // dirPath {string} - path to a directory.
    // cb {function} - callback when the enumaration completes. its second argument is an
    //     array of dll paths.   
    enumarateDir = function (dirPath, cb) {
        fs.readdir(dirPath, function (err, dirFiles) {
            var i;
            if (err) {
                cb(err);
                return;
            }

            // modify list to contain full file paths.
            for (i = 0; i < dirFiles.length; i++){
                dirFiles[i] = dirPath + '\\' + dirFiles[i];                
            }

            enumarateFiles(dirFiles, cb);
        });
    },

    //
    // the mstest driver ctor
    msTestDriver = function () {        
    };

    msTestDriver.prototype = {
        //
        // A dictionary of test names and their data.
        // each test has the following form: 
        // {
        //    dllPath: *Path to test dll*,
        //    name: *Test's fully qualified name*
        // }
        tests: {},

        //
        // Instantiates a msTestDriver with filePaths and type. Calls 'cb' with the initialized driver as input.
        // files {array | string}: a path to an .NET .dll library | a path to a directory containing 
        //      .NET .dll files | an array containing any of the previous.
        // type {string}: The type of test build to run. One of the following: 'Debug' | 'Release' | 'DebugChk'
        // cb {function} type: (err,driver) -> void: A callback function to be executed after the service has completed the init process.
        create: function (filePaths, type, cb) {
            var driver = new msTestDriver(),
                callback = cb ? cb : function (err) { if (err) throw err; };

            try {
                fs.mkdirSync(tempDir);
            } catch (err) {
                if (err && err.code !== 'EEXIST') {
                    console.error('Could not create directory at : ', tempDir);
                    callback(err);
                    return;
                }
            }

            driver.init(filePaths, type, function (err) { callback(err, driver); });
            return driver;
        },

        //
        // Loads every mstest dll appearing in files.
        // files {array | string}: a path to an .NET .dll library | a path to a directory containing 
        //      .NET .dll files | an array containing any of the previous.
        // type {string}: The type of test build to run. One of the following: 'Debug' | 'Release' | 'DebugChk'
        // cb {function}: A callback function to be executed after the service has completed the init process.
        init: function (files, type, cb) {
            var self = this,
            file,
            addTests = function (err, tests) {
                if (err) {
                    console.error(err);
                    console.error(err.stack);
                    cb ? cb(err) : (function () { throw err; })();
                }

                tests.forEach(function (test) {
                    self.tests[test.name] = test;
                    console.log('adding test: ' + test.name);
                });

                // activate the callback
                cb();
            };

            // modify 'ignorable' to not ignore 'type' argument
            delete ignorable[type];

            // if files is not an array
            if (typeof files !== 'object' || !files.length) {
                file = files;
                files = [];
                files.push(file);
            }

            loadfiles(files, addTests);
        },

        //
        // This method runs a test *testName* and calls the callback on the 
        // test result. The callback on the test result upon completion.    
        // testName {string}: The name of the test.  test's fully qualified name        
        // callback {function}: A callback function called upon test completion. Receives the test
        //      result as it's second argument.
        // context {object}: Test context. Attached to each nodeunit test's 'test' parameter
        runTest: function (testName, callback, context) {
            var test = this.tests[testName],
                params = [],
                commandline,
                i,
                l,
                testRunId = uuid.v1(),
                testResultDir = path.join(tempDir, testRunId),
                testResultPath = path.join(testResultDir, testRunId +'.trx');

            if (!test) {
                callback('Failed to run test :"' + testName + '". Not on service');
                return;
            }
            
            // create a directory for the specific test run execution
            try {
                fs.mkdirSync(testResultDir);
            } catch (err) {
                if (err) {
                    console.error('Could not create directory for test run at : ', testResultDir);
                    callback(err);
                    return;
                }
            }            
            
            console.log('Running mstest with test: "', test.name, '" and storing results at : "', testResultPath, '"');
            params.push('/noisolation');
            params.push('/testcontainer:' + test.dllPath);
            params.push('/test:' + test.name);
            params.push('/resultsfile:' + testResultPath);
            params.push('/runconfig:' + testSettings);

            commandline = mstestpath;
            for (i = 0, l = params.length; i < l; i++) {
                commandline += ' ' + params[i];
            }

            exec(commandline,
                {
                    encoding: 'utf8',
                    timeout: 0,
                    maxBuffer: 200 * 1024,
                    killSignal: 'SIGTERM',
                    cwd: null,
                    env: context
                },
                function (err, stdout, stderr) {
                    var resultFileExist = false,
                        files = fs.readdirSync(testResultDir),
                        i = 0,
                        l = files.length;

                    // check if the a trx result file has been created by mstest
                    for (i = 0, l = files.length; i < l; i++) {
                        if (path.join(testResultDir, files[i]) === testResultPath) {
                            resultFileExist = true;
                            break;
                        }
                    }

                    if (resultFileExist) {
                        require('./resultFormatter.js').parseResults(testResultPath, callback);

                        // else there was probably an error, since everyrun of mstest producess trx files
                    } else {
                        console.error('mstest.exe failed testing with dll : ' + test.dllPath + ', and test/category: ' + test.name);
                        console.error('mstest command line: ', commandline);
                        console.error('stderr:', stderr);
                        console.error('stdout:', stdout);
                        callback(err);
                        return;
                    }
                });
        },

        //
        // applies *callback* on an array containing the tests names from testSuite.
        // assuming testSuite's functions are nodeunit style tests    
        // callback {function}: A callback receiving the test names enumaration (array) as its second argument. 
        enumTests: function (callback) {
            var testNames = [],
                key;
            for (key in this.tests) {
                if (this.tests.hasOwnProperty(key)) {
                    testNames.push(this.tests[key].name);
                }
            }

            callback(null, testNames);
        }
    };

//
// exposed api
    exports.listen = function (filePaths, type, port, context) {
        msTestDriver.prototype.create(filePaths, type, function (err, driver) {
            if (err) {
                console.error('Failed to initialize rinuts-MSTestDriver');
                throw err;
            }

            var rinutsSvc = new rinuts(driver, context);
            rinutsSvc.listen(port);
        });
    }