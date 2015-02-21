var falcor = require('falcor');
var Observable = falcor.Observable;
var Keys = require('./Keys');
var SemanticAnalyzer = require('./operations/SemanticAnalyzer');
var ParseTree = require('./operations/ParseTree');
var PrecedenceProcessor = require('./operations/PrecedenceProcessor');

var Router = function(routes) {
    var router = {
        __virtualFns: null,
        get: null,
        set: null
    };
    
    var routeMatcher = SemanticAnalyzer.generate(ParseTree.generateParseTree(routes, router), router);
    var fn = function(pathActions, method, context, modelValue) {
        // only a set does jsong
        var matched = routeMatcher(pathActions);
        var sorted = matched.
            map(function(a) {
                // Casts the precedence array into a number
                a.precedence = +a.virtualRunner.precedence.join('');
                return a;
            }).
            sort(function(a, b) {
                // TODO: is this necessary?  We are still determining the precedence ordering.
                // TODO: and possibly re-execution of a lower precedence path 
                // TODO: if an Observable of Empty is returned from a higher precedence path.
                if (a.precedence > b.precedence) {
                    return -1;
                } else if (b.precedence > a.precedence) {
                    return 1;
                }
                // can't happen?
                return 0;
            });

        return PrecedenceProcessor.
            execute(
                pathActions.map(function(x) {
                    return x.path;
                }), sorted, method, context, modelValue);
    };
    //TODO: 'get' should just be passed in instead of creating objects
    this.get = function(paths, modelContext) {
        var results = fn(paths.map(function(p) {
            return {
                path: p,
                action: 'get'
            }
        }), 'get', modelContext);
        // Assumes falcor
        return accumulateValues(results);
    };
    //TODO: 'set' should just be passed in instead of creating objects
    this.set = function(jsongEnv, modelContext) {
        var model = new falcor.Model({
            cache: jsongEnv.jsong
        });
        var results = fn(jsongEnv.paths.map(function(p) {
            return {
                path: p,
                action: 'set'
            }
        }), 'set', modelContext, model);
        // Assumes falcor
        return accumulateValues(results);
    };
};

function accumulateValues(precedenceMatches) {
    var model = new falcor.Model();
    return Observable.
        // TODO: For time sake, this is equivalent to mergeDelayError().materialize()
        // TODO: This will need to be addressed for speed.
        from(precedenceMatches.results).
        flatMap(function(x) {
            return x.obs.
                materialize().
                map(function(jsongEnvNote) {
                    return {
                        note: jsongEnvNote,
                        path: x.path
                    };
                });
        }).
        reduce(function(acc, value) {
            // TODO: should be easy to accept all formats
            var note = value.note;
            var seed = [acc.jsong];
            if (note.kind === 'N') {
                if (router_isJSONG(note.value)) {
                    model._setJSONGsAsJSONG(model, [note.value], seed);
                } else {
                    model._setPathsAsJSONG(model, [].concat(note.value), seed);
                }
                acc.paths[acc.paths.length] = value.path;
            } else if (note.kind === 'E') {
                if (note.value && router_isJSONG(note.value)) {
                    model._setJSONGsAsJSONG(model, [note.value], seed);
                } else {
                    if (Router.__throwErrors) {
                        throw note.exception;
                    }
                    model._setPathsAsJSONG(model, [{path: value.path, value: {$type: 'error', message: note.exception.message}}], seed);
                }
                acc.paths[acc.paths.length] = value.path;
            }
            
            return acc;
        }, {
            jsong: {},
            paths: [],
            errors: []
        });
}

function router_isJSONG(x) {
    return x.jsong && x.paths;
}

Router.rangeToArray = function(ranges) {
    return Object.
        keys(
            ranges.reduce(function(acc, range) {
                var from = range.from || 0;
                var to = typeof range.to === 'number' ? range.to : range.length;
                for (;from <= to; from++) {
                    acc[from] = true;
                }
                return acc;
            }, {})).
        map(function(x) { return +x; });
};

Router.ranges = Keys.ranges;
Router.integers = Keys.integers;
Router.keys = Keys.keys;
module.exports = Router;


