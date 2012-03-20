var saxParser = require('sax'),
    fs = require('fs'),    
    MESSAGE = 'message',
    STACK_TRACE = 'stacktrace';

var registerParserEvents = function (parser, callback) {
    var xmlTreePositionStack = [],
        testResults = {};

    parser.onopentag = function (tag) {
        if (tag.name) {
            switch (tag.name) {
                case 'unittestresult':
                    if (tag.attributes && tag.attributes.testName) {
                        testResults.name = tag.attributes.testName;
                    }
                    if (tag.attributes && tag.attributes.duration) {
                        testResults.duration = tag.attributes.duration;
                    }
                    if (tag.attributes && tag.attributes.outcome) {
                        testResults.success = tag.attributes.outcome === 'Passed';
                    }
                    break;
                case MESSAGE:
                    xmlTreePositionStack.push(MESSAGE);
                    break;
                case STACK_TRACE:
                    xmlTreePositionStack.push(STACK_TRACE);
                    break;
            }
        }
    };

    parser.ontext = function (text) {
        var top = xmlTreePositionStack[xmlTreePositionStack.length - 1];
        if (top) {
            switch (top) {
                case MESSAGE:
                    testResults.message =  testResults.message || "";
                    testResults.message += text;
                    break;
                case STACK_TRACE:
                    testResults.stack = testResults.stack || "";
                    testResults.stack += text;
                    break;
            }
        }
    }

    parser.onclosetag = function (tag) {
        if (tag.name) {
            switch (tag.name) {
                case MESSAGE:
                    xmlTreePositionStack.pop(MESSAGE);
                    break;
                case STACK_TRACE:
                    xmlTreePositionStack.pop(STACK_TRACE);
                    break;
            }
        }
    }

    parser.onerror = function (err) {
        console.error('resultFormatter - error while parsing', err);
        callback(err);
    };

    parser.onend = function () {
        callback(null, testResults);
    };
}


exports.parseResults = function (filePath, cb) {
    var callback = cb || function () { },
        parser = saxParser.parser(false, { lowercasetags: true, trim: true });

    registerParserEvents(parser, callback);
    fs.open(filePath, "r", 0666, function (err, fd) {
        if (err) {
            console.error('resultFormatter - Failed to open file: ', filePath || "File path not specified");
            callback(err);
        }
        (function R() {
            fs.read(fd, 1024, null, "utf8", function (err, data, bytesRead) {
                if (err) callback(err);
                if (data) {
                    parser.write(data);
                    R();
                } else {
                    fs.close(fd);
                    parser.close();
                }
            });
        })();
    });
}
