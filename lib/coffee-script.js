(function() {
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var Lexer;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var RESERVED;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var compile;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var fs;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var lexer;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var parser;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var path;
  var _ref;
  fs = require('fs');
  path = require('path');
  _ref = require('./lexer'), Lexer = _ref.Lexer, RESERVED = _ref.RESERVED;
  parser = require('./parser').parser;
  if (require.extensions) {
    require.extensions['.coffee'] = function(module, filename) {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var content;
      content = compile(fs.readFileSync(filename, 'utf8'));
      return module._compile(content, filename);
    };
  } else if (require.registerExtension) {
    require.registerExtension('.coffee', function(content) {
      return compile(content);
    });
  }
  exports.VERSION = '1.1.0-pre';
  exports.RESERVED = RESERVED;
  exports.helpers = require('./helpers');
  exports.compile = compile = function(code, options) {
    if (options == null) {
      options = {};
    }
    try {
      return (parser.parse(lexer.tokenize(code))).compile(options);
    } catch (err) {
      if (options.filename) {
        err.message = "In " + options.filename + ", " + err.message;
      }
      throw err;
    }
  };
  exports.tokens = function(code, options) {
    return lexer.tokenize(code, options);
  };
  exports.nodes = function(source, options) {
    if (typeof source === 'string') {
      return parser.parse(lexer.tokenize(source, options));
    } else {
      return parser.parse(source);
    }
  };
  exports.run = function(code, options) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var root;
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.filename = process.argv[1] = options.filename ? fs.realpathSync(options.filename) : '.';
    if (root.moduleCache) {
      root.moduleCache = {};
    }
    if (path.extname(root.filename) !== '.coffee' || require.extensions) {
      return root._compile(compile(code, options), root.filename);
    } else {
      return root._compile(code, root.filename);
    }
  };
  exports.eval = function(code, options) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var __dirname;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var __filename;
    __filename = module.filename = process.argv[1] = options.filename;
    __dirname = path.dirname(__filename);
    return eval(compile(code, options));
  };
  lexer = new Lexer;
  parser.lexer = {
    lex: function() {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tag;
      var _ref;
      _ref = this.tokens[this.pos++] || [''], tag = _ref[0], this.yytext = _ref[1], this.yylineno = _ref[2];
      return tag;
    },
    setInput: function(tokens) {
      this.tokens = tokens;
      return this.pos = 0;
    },
    upcomingInput: function() {
      return "";
    }
  };
  parser.yy = require('./nodes');
}).call(this);
