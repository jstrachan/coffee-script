(function() {
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var ACCESSOR;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var CoffeeScript;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var SIMPLEVAR;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var Script;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var autocomplete;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var backlog;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var completeAttribute;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var completeVariable;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var error;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var getCompletions;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var getPropertyNames;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var readline;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var repl;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var run;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var stdin;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var stdout;
  var __hasProp = Object.prototype.hasOwnProperty;
  CoffeeScript = require('./coffee-script');
  readline = require('readline');
  Script = process.binding('evals').Script;
  stdin = process.openStdin();
  stdout = process.stdout;
  error = function(err) {
    return stdout.write((err.stack || err.toString()) + '\n\n');
  };
  backlog = '';
  run = function(buffer) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var code;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var val;
    code = backlog += '\n' + buffer.toString();
    if (code[code.length - 1] === '\\') {
      return backlog = backlog.slice(0, backlog.length - 1);
    }
    backlog = '';
    try {
      val = CoffeeScript.eval(code, {
        bare: true,
        globals: true,
        filename: 'repl'
      });
      if (val !== void 0) {
        process.stdout.write(val + '\n');
      }
    } catch (err) {
      error(err);
    }
    return repl.prompt();
  };
  ACCESSOR = /\s*([\w\.]+)(?:\.(\w*))$/;
  SIMPLEVAR = /\s*(\w*)$/i;
  autocomplete = function(text) {
    return completeAttribute(text) || completeVariable(text) || [[], text];
  };
  completeAttribute = function(text) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var all;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var completions;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var match;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var obj;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var prefix;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var val;
    if (match = text.match(ACCESSOR)) {
      all = match[0], obj = match[1], prefix = match[2];
      try {
        val = Script.runInThisContext(obj);
      } catch (error) {
        return [[], text];
      }
      completions = getCompletions(prefix, getPropertyNames(val));
      return [completions, prefix];
    }
  };
  completeVariable = function(text) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var completions;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var free;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var scope;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var _ref;
    if (free = (_ref = text.match(SIMPLEVAR)) != null ? _ref[1] : void 0) {
      scope = Script.runInThisContext('this');
      completions = getCompletions(free, CoffeeScript.RESERVED.concat(getPropertyNames(scope)));
      return [completions, free];
    }
  };
  getCompletions = function(prefix, candidates) {
    var el, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = candidates.length; _i < _len; _i++) {
      el = candidates[_i];
      if (el.indexOf(prefix) === 0) {
        _results.push(el);
      }
    }
    return _results;
  };
  getPropertyNames = function(obj) {
    var name, _results;
    _results = [];
    for (name in obj) {
      if (!__hasProp.call(obj, name)) continue;
      _results.push(name);
    }
    return _results;
  };
  process.on('uncaughtException', error);
  if (readline.createInterface.length < 3) {
    repl = readline.createInterface(stdin, autocomplete);
    stdin.on('data', function(buffer) {
      return repl.write(buffer);
    });
  } else {
    repl = readline.createInterface(stdin, stdout, autocomplete);
  }
  repl.setPrompt('coffee> ');
  repl.on('close', function() {
    return stdin.destroy();
  });
  repl.on('line', run);
  repl.prompt();
}).call(this);
